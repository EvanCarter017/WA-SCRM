# WA-SCRM — Project Specification for AI Agents

> **What this is.** A dense, verified description of the WA-SCRM system for an AI agent that has to understand, change, review or extend it: how the system works today, what must stay true, how it is built, verified and delivered, how it got here, what the owner decided, and what is still open. It is written to be shared: it contains no machine addresses, workspace or account names, keys, settings values or customer data.
>
> **Stamp.** Refreshed 2026-11-26 for the code as of commit `40ea119` (plan 080; later commits change only `plans/`); sections 12 and 13 also record plans 081 (the text font, commit `7ff5165`) 082 (the colour world, commit `f895056`) 083 (the chat page's room, commit `6f1c473`) and 084 (dialogs and the profile, commit `3dfdd1a`). Every concrete claim in sections 1–11 — about 440 of them: names, paths, routes, settings, numbers, data fields, behaviours — was re-checked against that code by two read-only checker agents, and each correction was confirmed in the code by the advisor before it was written here. First written 2026-11-25 (commit `17da196`) with the *improve — deep* framework: recon by the advisor, an audit by eight parallel read-only agents, every ranked finding vetted by the advisor.
>
> **How to read it.** Sections 1–3 for orientation; 4–7 before touching code in that area; 8–10 before any change at all; 11 before planning work; 12 for how the project got here; **13 before proposing anything** (decisions not to undo); 14 for what is open; 15 for the Chinese UI words. Where this document and the code disagree, **the code wins** — record the drift.

---

## 1. Product

**WA-SCRM** (UI name *WA Desk SCRM · WhatsApp 客户跟进闭环工作台*) is an internal web workbench for a small sales team that serves customers over WhatsApp. Each employee ("聊手", chat agent) has a **workspace** (子站, sub-site) with one or more WhatsApp numbers of their own, each linked by QR code; supervisors see every workspace read-only.

**The one promise** (PRODUCT.md): *a follow-up that a person scheduled never lapses.*

Core capabilities, as built:

| Area | What it does |
|---|---|
| WhatsApp chat (`#inbox`, 在线聊天) | Real WhatsApp messages through a self-hosted bridge (OpenWA): receive, send text and files (several at once), media (pictures, voice, video, documents), delivery and read ticks, retries, history catch-up, profile pictures, pinned chats; one customer per chat. |
| Follow-up loop (`#followups`, 跟进闭环) | To-dos (待办) created **by hand only**; completing one forces a choice: schedule the next or end the follow-up with a reason; a customer who writes again after "ended" resurfaces (复联待处理). Three prompts: awaiting reply, overdue, re-contact. |
| Customers (`#customers`, 客户列表) | List with tier (S/A/B/C/D) and status (已成交 / 弃单 / 自然线索), filters, export, 新增客户 (add by hand); 360° profile drawer with tabs (画像与跟进 persona & follow-up, activity, **order tracking** with shipping steps and undo, notes). The persona holds only what a person saved with 保存画像 (plan 079). |
| Tags | Fully user-defined tag groups; no presets, no automatic tagging; tag statistics page. |
| Chat records (`#chat-records`, 聊天记录) | Snapshots of a conversation moved in by hand with a reason, for review; no ratings. |
| AI (`#ai`, AI 能力) | Through server relays only (keys never reach the browser): **translate incoming messages once** and keep the result; **translate a reply before sending** (with the send guard on and the customer's language chosen, Enter translates first and the next Enter sends the translation; a configurable shortcut translates on demand); **translate a sent reply back** into the reading language; **voice note to text** on a click. Per-capability switches and usage records; reply tone (回复语气) and business description (业务说明) shape replies. |
| Price list (`#prices`, 价格表) and quotes (报价) | Upload an .xlsx/.csv price list (read in the browser), one currency for the list, removable for good. The 报价 button beside the message box opens a searchable list where products are ticked with a box; 确认 opens 确认报价 with quantity, unit price, amount and total; 放入消息框 puts one line per product and the total into the message box (section 4.8). Prices carry the currency's sign ("$40"). |
| Supervisor page | Employee list with each workspace's state and counts, one workspace's customers and chats read-only, account management (create, reset password, disable/enable, remove). |
| Emoji | The page ships Noto Color Emoji (11 WOFF2 parts, declared as a COLRv1 colour font), so emoji look the same on every browser that supports COLRv1; others keep their own emoji. |

**Deferred by the owner (do not build unasked):** lifecycle stages / funnel / pipeline configuration; quotes with LTV and repurchase reminders; follow-up task types; group messaging and auto-reply; materials management (素材管理, hidden since plan 032). The v0.7 implementation of the deferred items is in git history (`53b0bff`).

**Roles:** `agent` (one workspace; reads and writes it); `supervisor` and `admin` (read every workspace; create, reset, disable/enable and remove employee and supervisor accounts; only an admin may manage an admin account). Admin accounts are made with the command-line tool `site-admin.cjs` on the server; no route makes one.

---

## 2. Architecture

```
 browser ──HTTP──▶ gateway (nginx 1.27, port 8141)
                      │  /, static files, /api/auth/*, /api/site/*, /api/ai/* ─▶ master  (serve.cjs, site "master")
                      │  /api/data, /api/wa/* with cookie scrm_site=<id> ───────▶ wa-scrm-site-<id> (serve.cjs)
                      │  /site/<id>/api/(data|wa/*) (supervisor page) ──────────▶ wa-scrm-site-<id>
                      ✕  /api/wa/hook and /site/<id>/api/wa/hook are refused at the gateway
 master ──secret──▶ provisioner (site-provisioner.cjs, Docker Engine API through the socket)
 wa-scrm-site-<id> ◀──webhook (HMAC)── wa-scrm-openwa-<id> (OpenWA 0.31.0, whatsapp-web.js engine)
 wa-scrm-site-<id> ──REST──▶ wa-scrm-openwa-<id>
 master ──HTTPS──▶ model service (any OpenAI-compatible API) for translation and replies
 wa-scrm-site-<id> ──HTTPS──▶ speech service (OpenAI, Groq, Google Gemini or other) for voice notes
```

- **One process type.** Every server container runs `node work/wa-replica/serve.cjs 8080`. With `WA_SCRM_DATA_DIR` set it serves the page, the account/session/data API (`site-api.cjs`), the WhatsApp link (`openwa-link.cjs`) and the AI relay (`ai-relay.cjs`); without it, only the page and the relay.
- **Master** (`WA_SCRM_SITE_ID=master`) answers the page itself, sign-in for everyone, the supervisor page's account actions, `/api/site/*` (so a page's save-failure report lands in the master's log), translation and replies, and talks to the **provisioner**, which alone holds the Docker socket and creates/starts/stops/removes a workspace's two containers.
- **Per workspace:** `wa-scrm-site-<id>` (its server; also turns voice notes into text, `/api/wa/transcribe`) and `wa-scrm-openwa-<id>` (its WhatsApp bridge; a named volume `wa-scrm-openwa-<id>` keeps the WhatsApp sessions — one OpenWA session per linked number).
- **Shared data folder** (host path mounted at `/data`, read-write, in the master and **every** workspace server): `auth.db`, `site-<id>.db`, `wa-<id>.db`, `ai-translations.db`, `openwa-<id>.env`, `wa-media-<id>/`. The AI settings file is mounted read-only into the master and every workspace server.
- **Routing rule:** the gateway sends a request to the workspace its `scrm_site` cookie names (set at sign-in), or that `/site/<id>/…` names; every server still checks the session itself. Paths with a backslash, `%2F`, `%5C`, `//` or dot segments are refused with 400 by the gateway and by every server.
- **Plain HTTP** by owner decision. Behind the gateway `X-Forwarded-Proto` is always `http`, so cookies become `Secure` only with `WA_SCRM_COOKIE_SECURE=1` (for a TLS front later).
- **Workspace cap:** `WA_SCRM_MAX_SITES` (code default 4; set per machine).

---

## 3. Repository map

| Path | What | Edit? |
|---|---|---|
| `work/wa-replica/fidelity-*.js` | Browser modules (sources). | Yes, via plans. |
| `work/wa-replica/fidelity-index.html` | The page's HTML; the build copies it to `index.html` unchanged. | Yes, via plans. |
| `work/wa-replica/fidelity.css`, `fidelity-dashboard.css`, `fidelity-lifecycle.css` | The page's own styles; the build appends them to the base CSS in `app.css`, turning px values into size tokens (`tokens.css`). | Yes, via plans (percentages or existing sizes avoid new tokens). |
| `work/wa-replica/fidelity-base/` | Historical base app (`app.js`, CSS) that the build patches by text; its `index.html` is not used. | Avoid. |
| `work/wa-replica/build-fidelity.cjs` | Zero-dependency build: patches the base, inserts the modules, checks wording, writes `outputs/wa-replica-prototype/*`. | Yes, carefully. |
| `work/wa-replica/validate-scrm-lifecycle.cjs` | Validator: 249 assertions on sources and built files; writes `validation.json` with a summary entry per feature. | Yes, with every change. |
| `work/wa-replica/serve.cjs` | The server entry (static files, routing to the APIs). | Yes. |
| `work/wa-replica/site-api.cjs`, `site-auth.cjs`, `site-data.cjs` | Accounts, sessions, versioned document store. | Yes. |
| `work/wa-replica/openwa-link.cjs` | WhatsApp bridge link (webhook, event store, feed, sends, media, catch-up, voice to text). | Yes. |
| `work/wa-replica/ai-relay.cjs` | AI relay (translate, reply; the speech client used by the link), translation store. | Yes. |
| `work/wa-replica/site-provisioner.cjs` | Container lifecycle through the Docker Engine API. | Yes. |
| `work/wa-replica/site-admin.cjs` | Command-line tool on the server: accounts (including admins), data export/import. | Yes. |
| `work/wa-replica/*.test.cjs` | `node:test` files: relay 17, site API 20, OpenWA link 23, provisioner 13, price file 17 (the browser's file reader) — 90 tests. | Yes. |
| `work/wa-replica/*.env.example` | Setting templates (no values). `ai.env.example` lacks `AI_REASONING_EFFORT` and the `gemini` voice provider (finding DX-04). | Keep in sync with code. |
| `work/wa-replica/fonts/` | Noto Color Emoji parts + OFL licence (binary, from Google Fonts v50). | Only by a plan with checksums. |
| `outputs/wa-replica-prototype/` | **Built** page files, committed: `index.html`, `app.js`, `app.css`, `components.css`, `tokens.css`, `boot.js`, `master.js`, `pricefile.js`, `icons.js`, `lucide-license.txt`, `fonts/`, `validation.json`, `requirements.json`. Also old files the build does not write (`README.md`, `SCRM_Master_OpenWA_Handoff.md`, `design.html`, `interaction-validation.json`) — served to anyone (finding DOCS-02). | **Never by hand** — run the build/validator. |
| `deploy/` | `Dockerfile` (node:24-slim, pinned), `compose.yml` (gateway, master, provisioner), `gateway.conf`, `upgrade.sh`, `platform.env.template`. | Yes, via plans. |
| `plans/` | Implementation plans `NNN-*.md` (001–080), index `README.md` (status, owner requests, decisions, reviews), this spec. | Advisor only. |
| `replica/build-log.md` | Change log in Chinese, one entry per plan. | Append per plan. |
| `README.md`, `PRODUCT.md`, `DESIGN.md` | Run/deploy guide, product brief, UI spec (Chinese). Partly stale — see 11. | Via plans. |
| `build.cjs`, `validate.cjs`, `validate-fidelity.cjs`, `prepare.cjs`, `compile-styles.cjs`, `overrides.js`, `archive-v05-fidelity.html` | **Dead** v0.4/v0.5 tooling. Do not run (some overwrite outputs). | Candidates for removal. |

---

## 4. Browser application

### 4.1 Assembly and the override rule
- `build-fidelity.cjs` takes `fidelity-base/app.js` and applies ordered text patches (`swap`, `cut`; about 100 in all): about 56 to the base alone, then it inserts the modules **inside the base app's closure** just before its final `render()` — in this order: `fidelity-ui`, `fidelity-customer-pages`, `fidelity-operations`, `fidelity-openwa`, `fidelity-dashboard`, `fidelity-lifecycle`, `fidelity-ai`, `fidelity-pricelist`, `fidelity-subsite` — and the remaining patches, among them a loop of 31 wording replacements, run on the combined text → `outputs/.../app.js`. The build **fails** if the result contains words of a demonstration, prototype or review (演示|原型|评审|本机|示例|体验), simulation or reviewer tools.
- All modules share one scope. A module **overrides** a base or earlier function by reassignment (`render = function () { … }`, `toolsRailHTML = function (c) { … }`) or wraps it (`const aiDraw = render; render = function () { aiDraw(); … }`). **The last assignment wins**; earlier copies are dead (e.g. `toolsRailHTML` in `fidelity-ui.js` is overridden by `fidelity-lifecycle.js`). Before editing a function, find its live definition: search all modules and take the last one in the order above.
- Scripts in the page, in order: `icons.js` (Lucide SVG pool, 87 icons), `pricefile.js` (= `fidelity-pricefile.js`, reads price files), `app.js`, `master.js` (= `fidelity-master.js`, supervisor page), `boot.js` (= `fidelity-boot.js`, **last**: it owns sign-in and saving and calls `window.WA_MASTER` or `window.WA_START`, defined by the scripts before it).
- Rendering is string templates assigned with `innerHTML`; every value from data must go through `esc()`.

### 4.2 Start-up, sign-in and saving (`fidelity-boot.js`)
- `begin()` → `GET /api/site/status`, `/api/auth/session`, then `GET /api/data` → `start(user, site, {version, data})` sets `window.WA_SITE = { user, site, data, save, idle, signOut, halt, halted, purge }` and calls `window.WA_START()` (defined by `app.js`). Supervisors and admins get `WA_MASTER(user)` instead.
- **Save protocol:** every data change calls `persist()` → `WA_SITE.save(data)` → after 400 ms `flush()`. The data is split into **parts**: each top-level field is one part, except `messages` and `activities`, which are split per customer id (`messages/<customerId>`). Parts are compared with what was last saved (`synced`, JSON text) and changed ones are sent with `PUT /api/data { baseVersion, set, remove }`, at most 256 × 1024 characters of JSON per request (a larger single part goes alone), whole fields first, `waCursor` last.
- Server answer handling: `200` with a numeric `version` → saved; `409` (version conflict) or `401` → `stop()` shows a blocking screen with 刷新页面 (reload); anything else (incl. timeout after **30 s**, network error, 413) → keep the changes, show a notice, retry with backoff (2, 4, 8, 16, 30 s…), and report once per kind to `POST /api/site/report` (plan 067). A guard (`flush` wrapping `saveNow`) turns any exception in the save code into the same retry path.
- On `pagehide` the page flushes with `keepalive`.
- A page stopped with a notice stays stopped (plan 072): `WA_SITE.halted()` tells whether it was stopped; drawing (`renderSignInState`) then leaves the notice in place, and the WhatsApp feed is read no more.
- Known weak spots here: section 11 (CORR-03, PERF-01, CORR-12, CORR-04).

### 4.3 Views and their labels
Top tabs / sidebar: 首页 `#dashboard` · WhatsApp API `#inbox` (号码管理 numbers / 在线聊天 chat) · 客户列表 `#customers` · 跟进闭环 `#followups` · 账号列表 `#accounts` · 聊天记录 `#chat-records` · 标签管理 `#tags` · 标签统计 · AI 能力 `#ai` · 价格表 `#prices`. 素材管理 (materials) has no route, title or menu entry since plan 032 (`#materials` opens the home page; its code stays in `fidelity-operations.js`). Supervisors and admins get the supervisor page (`master.js`) instead of a workspace.

### 4.4 WhatsApp client (`fidelity-openwa.js`)
- `openwaListen()`: `GET /api/wa/status` → `POST /api/wa/claim` with the page's client id (only one page per workspace receives the feed; a later page takes over, the earlier one halts); both are asked again after 2, 4, 8 … at most 30 s until they are answered, and a 401 stops the page with 登录已失效 (plan 074) → loop `GET /api/wa/events?after=<waCursor>&client=<id>&wait=…` — `wait=0` until caught up, then `wait=25` (the server holds a request at most 25 s and sends at most 200 events per answer) — apply events (`openwaApply`), save, redraw (`openwaRefresh` → full `render()`); a stopped page reads no further (plan 072).
- Events become customers and messages: a new chat creates a customer (`source: '未知来源'`, `engagement: 'open'`); messages carry `wa` (WhatsApp id) and a status (`sending → sent → delivered → read`, `played` for voice, or `failed` / `unknown`). A customer made by hand (known by phone number only) and the customer made from the chat are joined into one record once the phone numbers match (plan 029).
- **Where customers come from: conversations only.** A message in either direction (also one sent from the phone) makes the customer within seconds; the catch-up — every 15 minutes, a few seconds after a server starts, and whenever a number comes online — goes through the number's one-to-one chats and fetches the latest 50 messages of each changed chat. Contacts saved on the phone without a conversation are not imported (owner decision, 2026-11-26). A customer's name is set once, when it is made: from the name WhatsApp gives with the chat (catch-up) or with an incoming message; when the first message was sent from the number, from the phone number — or "WhatsApp 客户" when WhatsApp gives only a privacy chat id. A customer made by hand (新增客户) starts with an empty conversation (plan 076), and its row's preview line reads 新建客户档案 until the first message (plan 077).
- Sending: `POST /api/wa/send` / `send-file` with a client request id (idempotent on the server); the page's own message is matched to its echo from the feed while it is 发送中 or 结果待确认 (`sending` or `unknown`; plan 075) — a 未发送 (`failed`) message never is.
- Numbers: 移除账号 in 账号列表 refuses a number that is still linked (`a.linked`) and asks to unlink it first in 号码管理 (plan 073).
- Keeping the conversation at its end: `openwaAtEnd` / `openwaEndTop` note whether the page itself put the conversation at its end; a picture loading in a conversation at its end scrolls it there again (`openwaShowEnd`). Anything that redraws the conversation and scrolls to the end must use `openwaShowEnd()` (plan 071).

### 4.5 AI client (`fidelity-ai.js`)
- Capabilities: `translate.inbound` (会话消息翻译), `translate.outbound` (发送前翻译), `voice.transcribe` (语音转文字). All calls go through `aiRun(capabilityId, input, meta)` → provider `server` → `/api/ai/translate`, `/api/ai/reply` (master) and `/api/wa/transcribe` (the workspace server); a result marked `cached` records no usage.
- A message is translated **once** into the reading language and keeps `translated` + `translatedTo`; the conversation on screen queues messages without the mark (2 at a time; after 3 failures in a row, nothing is asked for 60 s). Messages the page sent **as typed** are marked and never asked for; a reply that was translated before sending is left unmarked so it is **translated back** after sending (plan 066).
- Replies — the **send guard** is active when the relay is in use, the guard and 发送前翻译 are on, and the customer's language is chosen: then Enter translates first (shown above the box) and the next Enter sends the translation; a text without letters, or one already in the customer's language, goes as typed. Without an active guard Enter sends as typed. The shortcut (default Ctrl+Enter, configurable to any key) translates on demand; pressed again on a ready translation it only says how to send. Customer language is chosen per chat (客户语言), never preset.

### 4.6 Follow-up model (`fidelity-lifecycle.js`)
- `c.engagement`: `'open'` or `'closed'` (+ `closedReason`, `closedAt`, `reactivatedCount`). To-dos in `data.tasks`: `{ id, customer, owner, title, due (ISO), priority, done }`, plus `outcome` and `completedAt` once done. A customer shows follow-up information **only** if a person scheduled or ended a follow-up for them.
- Health (`lcHealth`): re-contact > overdue > awaiting reply > closed > normal. **Overdue is day-based** (`beforeToday(due)`): a to-do due "in 2 hours" is not overdue until the next day.

### 4.7 Supervisor page (`fidelity-master.js`)
Lists employees and their workspaces (state, numbers, counts — read with `/site/<id>/api/data?fields=…` and `/site/<id>/api/wa/status`); opening a workspace reads its whole document (`/site/<id>/api/data`) and shows customers and chats read-only (media through `/site/<id>/api/wa/media`); accounts are managed through the master's `/api/auth/users*` routes. Every `/api/data` read by someone other than the workspace's employee is logged (`site data read user=… role=… site=… fields=…`); reads of WhatsApp status, media and profile pictures are not logged.

### 4.8 Price list and quotes (`fidelity-pricelist.js`, `fidelity-pricefile.js`)
- `data.priceList`: `{ file, at, by, currency, columns: { code, name, spec, prices: [header…] }, rows: [{ code, name, spec, prices: [text…] }] }`. A file is read in the browser (`WA_PRICE_FILE.read`; ≤ 5 MB; columns of numbers are price columns, the others code, name, specification), shown in a confirm dialog with the currency choice (售价币种; 18 codes or none), then saved; 彻底删除价格表 removes it with every trace on the server (`DELETE /api/data`, plan 049).
- Prices carry the sign of the list's currency (`PRICE_SYMBOLS`, plan 078): USD $, EUR €, GBP £, CNY ¥, JPY JP¥, HKD HK$, AUD A$, CAD C$, SGD S$, MXN MX$, BRL R$, INR ₹, RUB ₽, KRW ₩, VND ₫, THB ฿; AED and SAR keep their codes; a price written with its own sign in the file stays as it is. The 价格表 page names the currency by code.
- The quote dialog (报价, plan 080): search by code, name or specification (at most 50 rows shown); a box on the left ticks a product (ticks stay while searching); `priceView.picked` holds `{ row, at, qty, price }` in the order ticked. 确认 opens 确认报价: quantity (a whole number ≥ 1, default 1), unit price (the list's price as a number, editable), the price column for lists with several, amount, total; 删除 (delete), 返回列表 (back, edits kept), 取 消 (cancel, nothing inserted). 放入消息框 appends one line per product and the total to the message box — `Product Alpha PRDA01 (spec): $40 x 10 = $400` … `Total: $440` — and sends nothing. Figures are plain (at most two decimals, no thousands separators).

### 4.9 Customer profile — the persona (plan 079)
- The tab 画像与跟进 shows the current to-do, the persona form 结构化客户需求画像 (`#lc-qual-form`: 意向等级 `intentLevel` — 高意向 / 中意向 / 了解中, starting on 请选择; and `qualification { demand, volume, deliveryRegion, objection, commWindow }`) and the block of tags and attribution (进线渠道 source; 广告素材 / 证据 shows `c.ad` or —; 负责聊手 / 接待号).
- **Manual entry only:** only 保存画像 writes the persona (its history line starts with 更新客户需求画像). Customers from WhatsApp and from 新增客户 start empty; the 初步需求 typed in 新增客户 stays in the notes. Once per workspace (`data.personaManual`), the values the page used to fill in by itself were cleared — except where a person had saved the persona.

---

## 5. Data model

### 5.1 Workspace document (`GET/PUT /api/data`, table `doc` in `site-<id>.db`)
Top-level fields (defaults set by boot): `version`, `members`, `accounts`, `tagGroups`, `tags`, `customers`, `messages` (map by customer id → array, saved per id), `activities` (map by customer id → history lines, saved per id), `tasks`, `quickReplies`; added by modules: `ai`, `priceList`, `waCursor`, `chatArchives`, `roleGroups`, `operations`, `personaManual` (one-time flag of plan 079). An old field `tagDefs` is converted into tag groups and deleted when found.

- **Customer:** `{ id, name, initials, color, phone, waChat, country, city, timezone, language, owner, account, tags[], engagement, source, campaign, ad, unread, star, pinned, last, lastAt (orders the chat list), preview, translation, followup, notes, contactRefs[], createdAt, updatedAt, clientType, reactivatedCount }`, plus `tier` ('' or S/A/B/C/D), `customerStatus` ('' or `converted` / `abandoned` / `organic` — 已成交 / 弃单 / 自然线索), `closedReason`, `closedAt`, `intentLevel` (optional), `qualification { demand, volume, deliveryRegion, objection, commWindow }` (the persona; manual only), `orders[] { id, number, placedAt, shipping, history[] { shipping, at } }`.
- **Message:** `{ id, side: 'in'|'out', text, time, at (ms), wa?, type?, file?, status?, request?, translated?, translatedTo?, transcript?, revoked?, edited? }`; statuses `sending`, `sent`, `delivered`, `read`, `played`, `failed`, `unknown`.
- **To-do** (`tasks[]`): `{ id, customer, owner, title, due, priority, done, outcome?, completedAt? }`.
- **AI settings** `data.ai`: `{ enabled{capability: bool}, totals{capability: {calls, inputChars, outputChars}}, usage[] (≤200), readLanguage, tone ('casual'|'friendly'), business, sendGuard, translateKey }`.
- **Price list** `data.priceList`: section 4.8. `waCursor`: the last WhatsApp feed event applied.

### 5.2 Server stores (SQLite via `node:sqlite`, WAL)
| File | Tables | Notes |
|---|---|---|
| `auth.db` | `users(id, username, name, role, site, password, must_change, disabled, created_at)`, `sessions(token_hash, user_id, created_at, last_seen)` | scrypt passwords, SHA-256 token hashes; sessions end after 7 idle / 30 days; 5 failures → 5-minute lock; password ≥ 8 (owner decision, plan 050). Shared by all servers. |
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
| | `GET /api/auth/sites`, `GET/POST /api/auth/users`, `POST /api/auth/users/{reset,disable,enable,remove}` | supervisor/admin (admin accounts: admin only) |
| | `GET /api/data` (also `?fields=`), `PUT /api/data`, `DELETE /api/data` (purge `priceList` only) | read: own employee + supervisors/admins; write: own employee |
| | `POST /api/site/report` | any signed-in user (logs one sanitized line; reaches the master) |
| `openwa-link.cjs` | `GET /api/wa/{status,link,events,media,avatar}`, `POST /api/wa/{claim,link,unlink,send,send-file,transcribe}` | the workspace's employee; supervisors/admins may read `status`, `media` and `avatar` through `/site/<id>/api/wa/…`; `link`, `events` and every write are the employee's only |
| | `POST /api/wa/hook` | OpenWA only (HMAC signature; refused at the gateway) |
| `ai-relay.cjs` (on the master) | `GET /api/ai/status`, `POST /api/ai/translate`, `POST /api/ai/reply` | signed-in users; JSON bodies only (415 otherwise) |
| `site-provisioner.cjs` (internal port 8090) | `GET /health` (no secret); `GET /sites`, `POST /sites { id }`, `POST /sites/<id>/start`, `/stop`, `/remove` | the master, with the shared secret |
| `serve.cjs` | static files of `outputs/wa-replica-prototype` | anyone; page files `no-cache` + ETag (304 when unchanged), font parts `immutable` |

`site-api.cjs` and `openwa-link.cjs` (except the hook) refuse non-GET requests marked `Sec-Fetch-Site: cross-site`; the AI relay has no such check. Cookies are `HttpOnly; SameSite=Lax` (`Secure` see section 2).

### 6.2 AI relay settings (file named by `WA_SCRM_AI_ENV`; names only)
`AI_PROVIDER` (`openai`, `deepseek`, `groq` or `other` — any OpenAI-compatible service), `AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`, `AI_REASONING_EFFORT` (none|minimal|low|medium|high; an invalid value turns translation and replies off, voice keeps working), `VOICE_PROVIDER` (`openai`, `groq`, `gemini` or `other`), `VOICE_BASE_URL`, `VOICE_MODEL`, `VOICE_API_KEY`. Gemini voice uses a native `generateContent` request (≤ 14 MB). Timeouts are environment variables read at start: `WA_SCRM_AI_TIMEOUT_MS`, `WA_SCRM_AI_VOICE_TIMEOUT_MS`. The file is mounted into the master and every workspace server. Never print or commit it.

### 6.3 WhatsApp link settings (file named by `WA_SCRM_OPENWA_ENV`; names only)
The file holds exactly `OPENWA_BASE_URL`, `OPENWA_API_KEY`, `OPENWA_HOOK_URL`, `OPENWA_HOOK_SECRET` (at least 32 characters, else the link reports "not configured"); the provisioner writes `openwa-<id>.env` into the data folder with an operator-role key. Tuning, as environment variables read at start: `WA_SCRM_OPENWA_TIMEOUT_MS` (20000), `WA_SCRM_OPENWA_MEDIA_TIMEOUT_MS` (60000), `WA_SCRM_OPENWA_SYNC_MS` (900000 = 15 min), `WA_SCRM_OPENWA_SYNC_PAUSE_MS` (1000). Catch-up imports up to 50 messages per chat; files ≤ 16 MB to send, ≤ 50 MB to keep.

### 6.4 Other environment
- **Server:** `WA_SCRM_DATA_DIR`, `WA_SCRM_SITE_ID` (default `default`), `WA_SCRM_LISTEN` (default 127.0.0.1), port as the first argument (default 56141), `WA_SCRM_PROVISIONER_URL`, `WA_SCRM_PROVISIONER_SECRET_FILE`, `WA_SCRM_COOKIE_SECURE`.
- **Provisioner:** required `WA_SCRM_PROVISIONER_SECRET_FILE` (≥ 32 characters), `WA_SCRM_SERVER_IMAGE`, `WA_SCRM_OPENWA_IMAGE`, `WA_SCRM_HOST_DATA_DIR`, `WA_SCRM_DATA_DIR`; optional `WA_SCRM_HOST_AI_ENV`, `WA_SCRM_NETWORK` (wa-scrm), `WA_SCRM_PROVISIONER_PORT` (8090), `WA_SCRM_DOCKER_SOCKET` (/var/run/docker.sock), `WA_SCRM_MAX_SITES` (4), `WA_SCRM_MIN_FREE_MB` (1400), `WA_SCRM_OPENWA_MEMORY_MB` (1536), `WA_SCRM_SERVER_MEMORY_MB` (256 in the code; 512 in compose and the template), `WA_SCRM_RUN_AS` (1000:1000).
- **Machine file** (`deploy/platform.env.template`): `WA_SCRM_HOST_DATA_DIR`, `WA_SCRM_HOST_AI_ENV`, `WA_SCRM_HOST_SECRET`, `WA_SCRM_RUN_AS`, `WA_SCRM_DOCKER_GID`, `WA_SCRM_PORT`, `WA_SCRM_COOKIE_SECURE`, `WA_SCRM_MAX_SITES`, `WA_SCRM_MIN_FREE_MB`, `WA_SCRM_OPENWA_MEMORY_MB`, `WA_SCRM_SERVER_MEMORY_MB`; `WA_SCRM_SERVER_IMAGE` and `WA_SCRM_OPENWA_IMAGE` may also be set there (not in the template).

### 6.5 Request limits
Gateway 20 MB per request (16 KB for `/api/auth/`); site API 8 MB; AI relay 32 KB; WhatsApp link 16 KB for JSON and 4 MB for the hook; voice to text 24 MB; one stored value 2 MB.

---

## 7. Platform and deployment

- **Images:** gateway `nginx:1.27-alpine` and servers `node:24-slim` pinned by digest; OpenWA `ghcr.io/rmyndharis/openwa:0.31.0` pinned by digest (`WA_SCRM_OPENWA_IMAGE`).
- **Hardening:** read-only root file systems, `no-new-privileges`, memory limits, `/tmp` tmpfs; the master, the provisioner and the workspace servers drop all capabilities and run as `WA_SCRM_RUN_AS`; the gateway adds back CHOWN, SETGID and SETUID (nginx) and OpenWA containers add back CHOWN, DAC_OVERRIDE, FOWNER, KILL, SETGID and SETUID, both with their images' own users. Only the provisioner has the Docker socket; only the gateway publishes a port.
- **Upgrade (the only deploy path):** on the machine, `git pull --ff-only && sudo bash deploy/upgrade.sh <machine settings file>`. The script tests `gateway.conf` with the pinned nginx first (a broken config changes nothing), builds the server image, renews the gateway, master and provisioner, then removes every workspace server and asks the provisioner to start again those that were running (a stopped workspace gets the new image when it is next started). **OpenWA containers are left running**, so no WhatsApp session is interrupted.
- **Operational rules:** never run two copies of the same WhatsApp session (two OpenWA containers on one number); the bridge is unofficial — use spare numbers, no bulk messaging; settings and data live outside the repository.

---

## 8. Build, verify, deliver

**Node:** 22.13+ (built-in SQLite); the platform image uses Node 24. On a development machine the `node` on PATH may be too old — use a Node ≥ 22.13 binary for tests.

| Step | Command | Expected |
|---|---|---|
| Restore the icon pool (before **every** build) | `git checkout <the plan's base commit> -- outputs/wa-replica-prototype/icons.js` | exit 0 |
| Build | `node work/wa-replica/build-fidelity.cjs` then `git reset -q HEAD -- outputs/wa-replica-prototype/icons.js` | JSON with `"version": "0.8-scrm-engagement"`, `"icons": 87` |
| Validate | `node work/wa-replica/validate-scrm-lifecycle.cjs` | `"status": "passed"` (writes `validation.json`) |
| Tests | `node --test` from the repository root (finds the 5 files; 90 tests) or each `work/wa-replica/<x>.test.cjs` | all pass |
| Gateway config | `nginx -e stderr -t -q -c "$PWD/deploy/gateway.conf"` (or the pinned image as `upgrade.sh` does) | exit 0 |

Apart from `price-file.test.cjs` (the browser's price-file reader), browser behaviour has **no tests in the repository** (a deliberate zero-dependency choice); it is verified by the reviewer's own headless-browser suites and probes outside the repository.

**Delivery workflow (how every change has been made):** the advisor writes `plans/NNN-<slug>.md` (exact find/replace edits with sha256 checksums, a smoke script, done criteria, STOP conditions) after rehearsing it on a scratch copy, and indexes it in `plans/README.md` → an executor agent applies it in an isolated git worktree and commits → the advisor reviews (byte comparison with the rehearsal copy, all tests, validator, smoke, deliberate faults that must be caught, a browser probe showing the old and the new behaviour, the full browser suites run alone) → squash-merge to `main` with a conventional commit (`feat(scrm): …`, `fix(scrm): …`, `perf(scrm): …`) ending with a `Co-Authored-By` line → push → deploy with `upgrade.sh` → live checks. Each plan appends an entry to `replica/build-log.md` (Chinese) and adds or updates a summary entry in the validator's result.

**Public auto-sync:** a background service commits and pushes changes in this repository to a **public** GitHub repository within about 30 seconds. Anything written into the working tree can become public.

---

## 9. Conventions

- **Languages:** code, comments, commit messages and plans in English; user-facing text and project docs (README, PRODUCT, DESIGN, build log) in Simplified Chinese. The owner does not read Chinese — describe UI to them as "中文 (meaning)".
- **Style:** 2-space indent, single quotes, semicolons, `const`/arrow functions in modules (the base app is compact, minified-looking style — match it there); no dependencies; comments explain *why* in plain sentences and cite the plan (`(plan 066)`); tables size their columns with a `colgroup` and rules in the style sheet; validators assert exact source lines.
- **Naming debt accepted:** `fidelity-lifecycle.*` and the `lc` prefix stay (the module is the follow-up loop).
- **Data handling:** never print keys, passwords, tokens or customer content; inspect real data as counts and structure only; logs carry names and outcomes, never message text (enforced by a validator check on log lines).
- **Scope discipline (the owner's standing rules):** bug fixes and requested features have equal priority; no unrequested refactors or additions; ambiguous requirements are asked, not assumed (short questions with two options and a recommendation); map dependencies before adding anything; a question from the owner is answered and recommended, not built; once a change is approved, build exactly that.

---

## 10. Invariants — must stay true

1. Follow-up information appears only for customers a person scheduled or ended a follow-up for; nothing creates to-dos or tags automatically.
2. AI keys and model calls stay on the servers; the browser only talks to its own origin.
3. A message is translated at most once per reading language; the same text into the same language is a single model call platform-wide.
4. Customer language is chosen per chat, never preset; replies to a customer with a chosen language pass the send guard.
5. An employee writes only their own workspace; supervisors and admins read it; every `/api/data` read by someone other than the workspace's employee is logged.
6. One page per workspace receives the WhatsApp feed; a later page takes over and the earlier one stops.
7. Sends are idempotent per client request id. (A double sign-in can still start two app instances — finding #11.)
8. Built outputs in `outputs/wa-replica-prototype/` are produced by the build and validator only, and are committed.
9. Nothing secret, no data folder, database or settings file is ever inside the repository.
10. A broken gateway configuration never reaches a running gateway (`upgrade.sh` tests it first); OpenWA containers are not restarted by an upgrade.
11. The conversation that shows its end keeps showing it when content above or within it changes (`openwaShowEnd` after any redraw).
12. A page stopped with a notice stays stopped: nothing draws the app behind the notice, and the WhatsApp feed is read no more (plan 072).
13. A number that is still linked to WhatsApp is never removed from the page's account list (plan 073).
14. Every way of making a customer gives it its own conversation list (`data.messages[id] = []`), so no message from the customer is made up (`openwaNewCustomer`; plan 076 for customers made by hand).
15. The persona of the customer profile holds only what a person entered with 保存画像: no default intent level, no value filled in from messages, notes, country or language, no made-up attribution (plan 079).
16. Nothing in the quote dialog sends a message; 放入消息框 only appends text to the message box (plans 037, 078, 080).

---

## 11. Known issues and risks (deep audit, vetted)

Every row was re-checked against the cited code by the advisor (**V** = confirmed by reading or, where stated, by measurement; **P** = mechanism plausible, trigger or scale not confirmed). IDs are the audit's; details follow the table. Effort: S hours · M a day · L days. Status as of plan 080.

| # | ID | Finding | Category | Impact | Effort | V/P |
|---|---|---|---|---|---|---|
| 1 | CORR-01 | **Fixed by plan 072.** A halted page (save conflict, expired login, taken over) came back on the next redraw and silently discarded every later edit | correctness | data loss without any sign | S | V |
| 2 | DX-06 / SEC-11 | `.gitignore` has no rule for `*.env`, `*.secret`, `*.db*`, `.claude/` — and the repo auto-publishes within ~30 s. **Declined by the owner** (2026-11-25) | security | a filled settings file or database dropped in the tree becomes public | S | V |
| 3 | CORR-02 | **Fixed by plan 073.** Removing a number in 账号列表 while it was still linked dropped all its later messages for good | correctness | lost customer messages | S | V |
| 4 | CORR-06 | **Start fixed by plan 074; the exception half is open.** The WhatsApp feed never started if its first status/claim call failed; it still stops for good if applying an event throws, with no notice | correctness | no new messages until reload | S | V (start) / P (exception) |
| 5 | CORR-05 | **Fixed by plan 075.** After a reload, unconfirmed sends became `unknown`, but echoes matched only `sending` → the reply showed twice or a phantom customer appeared | correctness | duplicates, wrong customers | S | V |
| 6 | CORR-07 | **Fixed by plan 076.** A hand-made customer's 初步需求 was shown — and later stored — as an incoming message from the customer | correctness | false history in chats and archives | S | V |
| 7 | BUG-01 | Catch-up skips a chat whose newest message came through the webhook, so a message the webhook missed earlier is never fetched | correctness | permanently missing messages | M | V |
| 8 | CORR-03 / BUG-06 | A save whose answer was lost (30 s limit since plan 067, dropped connection, deploy) is retried with the old version → a false 409 stops the page (since plan 072 visibly, with the notice) | correctness | lost last edit, needless reload | S–M | V |
| 9 | PERF-01 / BUG-04 / SEC-02 | Any single stored value > 2 MB is refused and retried forever, blocking every part after it (incl. the feed cursor); `customers`, `chatArchives`, one conversation are single values; a sender of very long texts can trigger it | correctness / security | saving stops (visible notice) | M (stopgap S) | V |
| 10 | CORR-12 | The save on page close uses `keepalive`, which browsers cap at 64 KB; larger pending parts (e.g. `customers`) are lost on close/reload | correctness | last edits lost | M | V (measured: a 70 KB change was not saved, a small one was) |
| 11 | CORR-04 | The sign-in button is re-enabled before the data load; a second submit starts two app instances → every reply sent twice, saves dropped | correctness | double sends (likely on slow links) | S | V (mechanism) |
| 12 | BUG-02 / SEC-01 | Sign-in lock counts parallel failures as one and is wiped after 5,000 failed names; no rate limit; outsiders can keep an account locked | security | brute-force lock bypass, lockout | S | V |
| 13 | CORR-08 | A phone-only customer's chat id is guessed from a pending send with the same text (since plan 075 also from a reply marked `unknown`, which survives reloads) or a file upload in progress, and stored for good | correctness | replies to the wrong person (rare) | M | V (code) |
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
| 27 | SEC-06 | The `Sec-Fetch-Site` check never fires over plain HTTP (browsers send it only to secure origins) and the AI relay has none; CSRF is in practice stopped by SameSite=Lax + JSON content types; no CSP | security | defence in depth only | S | V |
| 28 | DOCS-02 | A stale pre-v0.8 README and internal design files are served next to the app (not a disclosure: the repository itself is public) | docs | misleading | S | V |

**Ordering notes.** #1 came first (fixed by plan 072): it turned several other faults (#8, a save conflict, a lost session) into silent data loss; #8 now ends on the notice instead. #17 (one verification command) and #23 (pure-function tests for the save client and feed) should precede risky refactors of `fidelity-boot.js` / `fidelity-openwa.js`. #9 and #10 share one remedy direction (split `customers`, `chatArchives` and long conversations into smaller parts). #19 removes a step every plan repeats.

### 11.1 Details of the top findings (locations as of plan 080)
- **CORR-01 (fixed by plan 072).** `fidelity-subsite.js:5-13`: `renderSignInState()` now returns false while `window.WA_SITE.halted()` (`:8`) before it shows the app (`:9`); `build-fidelity.cjs:58` makes it the first statement of every `render()`; `fidelity-boot.js:130-131` `stop()` sets `stopped`, exposed as `halted` (`:250`); the feed loop checks it at `fidelity-openwa.js:830`, `:844`, `:854`.
- **DX-06 (declined).** `.gitignore` covers only OS and old artefacts (`Thumbs.db`, …).
- **CORR-02 (fixed by plan 073).** `fidelity-ui.js:420-421` (the refusal of linked numbers); `fidelity-openwa.js:674-687` drops events of unknown accounts.
- **CORR-05 (fixed by plan 075).** `fidelity-openwa.js:839` resets `sending` → `unknown` at start; `:755` pairs an echo with a reply in `sending` or `unknown`; `:717` the phone-only lookup (see CORR-08).
- **CORR-07 (fixed by plan 076).** The base `conversationMessages(c)` (patched in by the build) invents `{side:'in', text:c.preview}` for a customer without a list; `fidelity-lifecycle.js:1321` gives a hand-made customer its empty list, and `:1310` sets its preview to 新建客户档案 (plan 077).
- **BUG-01.** `openwa-link.cjs:790` raises a chat's `stamp` on every webhook message (`keepChat` uses `MAX`); `:839-840` skips imported chats whose list stamp is not newer. *Fix:* only history imports advance `stamp`; dedupe webhook messages by id.
- **CORR-03.** `site-data.cjs:96-99` accepts a write only if `baseVersion` equals the current version and cannot recognise a repeat. *Fix:* a client save id stored with the save; a repeat answers 200 with the stored version.
- **PERF-01.** `site-data.cjs:9,93` (`MAX_VALUE` 2 MB); `fidelity-boot.js:8` splits only `messages`/`activities`; `:143-153` always sends the first changed part; failures retry the same batch. *Stopgap:* send an oversized part last and alone, name it in the 413, keep saving the rest. *Lasting:* split `customers`, `tasks`, `chatArchives` per id; page long conversations.
- **CORR-04.** `fidelity-boot.js:271-272`: the sign-in button is enabled again before `begin()` loads the data. *Fix:* keep it disabled until the app has started; ignore a second start.

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
OpenWA's own behaviour (webhook retry window, idempotency memory); runtime measurements beyond those stated; CSS; full bodies of the plans (71 at the time of the audit); `work/scrm-customization*`; online checks of upstream versions.

---

## 12. History — the plans in short

Every change since 2026-11-17 was made through a numbered plan (`plans/NNN-*.md`, index in `plans/README.md`), executed by an executor agent and reviewed before merging. Read the plan file for any detail; the index records each owner request and each review.

**Reshaping the prototype (2026-11-17 – 18).** 001 the engagement loop with tags as support; lifecycle stages, pipelines and deals removed · 002 no invitation codes · 003 manual tier (S/A/B/C/D) and status · 004 chat history as a review archive of snapshots · 005 one AI integration point, switchable per capability, with usage records · 006 no rating panel in the archive · 007–008 tags on the chat list's customer cards · 009 follow-up labels open the follow-up centre · 010–016 order tracking in the profile (shipping steps by two buttons, one section per order, undo, icon actions, collapsed blocks with a progress bar, the order form pinned).

**Real translation (2026-11-20 – 21).** 017 translation settings off the chat screen · 018 real translation through a server-side AI relay · 019 reviewer tools removed · 020 replies translated before sending, send guard, tone and business description · 021 demo provider and sample translations removed.

**Production foundation (2026-11-21 – 22).** 022 server side of a workspace: accounts, sessions, data · 023 the page signs in and keeps its data on the server · 024 prototype leftovers removed · 025–026 the real WhatsApp connection through the workspace's own OpenWA (QR code, messages, sending; simulation removed) · 027 QR codes that change · 028 catch-up when a number comes online and every 15 minutes · 029 one person, one record · 030 saving in parts · 031 follow-up to-dos by hand only · 032 release wording; materials screen hidden · 033 pictures, voice notes, videos, files in messages · 034 voice note to text on a click · 035–036 the follow-up centre holds only what people entered; to-dos deletable.

**Working day to day (2026-11-22 – 23).** 037 price list page and the 报价 quote button · 038 the customer's language chosen in the chat, never preset · 039 no follow-up information without a hand-made follow-up · 040 the chat list keeps its place · 041 an ended follow-up can be removed · 042 messages translated once and kept · 043 files sent from the message box · 044 profile pictures · 045–046 a number's state shown only when it is not connected · 047 several files at once · 048 early receipts kept · 049 the price list can be removed for good · 050 passwords of eight characters.

**Several employees (2026-11-23 – 24).** 051 several workspaces behind one address · 052 the supervisor page (employees; customers and chats read-only) · 053 three follow-ups to it · 054 accounts managed from the supervisor page · 055 containers and the provisioner · 056 an employee with a workspace of their own made from the supervisor page · 057 an account can be deleted for good · 058 findings of an independent review.

**Refinements (2026-11-24 – 25).** 059 one currency for the price list · 060 a translation shortcut set under a gear · 061 chats pinned by right-click · 062 any key as the shortcut · 063 the sender's own words when one workspace writes to another · 064 voice notes into text with Google Gemini · 065 a reasoning effort for the model · 066 under a sent translated reply, the sent text translated back · 067 saving that cannot stop silently (time limit, guard, notice, report) · 068 the page ships Noto Color Emoji · 069 compression and caching · 070 the permissions note removed from the chat's tool rail · 071 a conversation at its end stays there when a translation redraws it.

**Deep audit fixes and owner requests (2026-11-25 – 26).** 072 a stopped page stays stopped · 073 a linked number is not removed from the account list · 074 the WhatsApp feed starts also when its first questions fail · 075 a reply whose outcome is open shows once · 076 a customer made by hand starts with an empty conversation · 077 its chat list row reads 新建客户档案 until the first message · 078 several prices ticked in the quote dialog; currency signs · 079 the persona of the customer profile is for manual entry only · 080 quote dialog: a box per product and a confirm window with quantity, unit price, amount and total.

**UI upgrade (2026-11-26 –).** The owner's upgrade brief (kept outside the repository) was planned and approved: Pass A = 081–084 (font; colours, type and shell; inbox; quote dialogs and profile drawer), Pass B = 085–087 (home and follow-ups; tables; supervisor page). 081 the page's text in HarmonyOS Sans SC, shipped with the app · 082 one colour world (teal accent, cool neutrals, hairlines, readable greys) declared on `:root`, the shell and the shared controls on the closed scale · 083 the chat page gives the conversation its room (no row of page tabs there, compact rows, the layout filling the page: 336 px of 768 for the messages instead of 189), calm bubbles, the follow-up states in their own tints (overdue amber, re-contact rose by `data-state`, awaiting reply sky) · 084 dialogs (radius 12, slate backdrop below the header on the chat page), 报价 and 确认报价 (row targets, count badge, figures on the right), the 360° profile on the closed scale (an overdue to-do amber). Pass A complete.

---

## 13. Owner decisions (do not undo them)

These are the owner's own choices, recorded with their dates in `plans/README.md`. A change that contradicts one needs the owner first.

- **Production, not prototype** (2026-11-21): no demonstration, prototype, sample or review content; a "demo" label may go only when the function behind it is real.
- **Follow-ups are manual only** (plans 031, 035, 036, 039, 041): nothing creates to-dos or signals by itself; a customer without a hand-made follow-up shows no follow-up information anywhere.
- **The persona of the customer profile is manual only** (plan 079): nothing fills it in; the automatic values were cleared once.
- **Customers come from conversations only** (2026-11-26): contacts saved on the phone are not imported.
- **Text font HarmonyOS Sans SC, shipped with the app** (081, 2026-11-26): Huawei's Regular and Bold files unmodified (the licence forbids changes — no subsetting, no WOFF2), the licence file beside them, the notice 本系统使用 HarmonyOS Sans 字体 on the sign-in screen; a new version of the font needs new file names (browsers keep `/fonts/*.ttf` a year). The UI upgrade's colour world (teal accent, cool neutrals, hairlines) and the row of page tabs hidden on the chat page come with plans 082–083.
- **The customer's language is chosen per chat**, never preset (038); a message is translated once and kept (042).
- **AI keys stay on the servers**; the browser talks only to its own origin (018 onwards).
- **Quotes** (037, 049, 059, 078, 080): one currency per price list; the quote dialog ticks products with a box; a confirm window takes quantity and unit price and adds amounts and a total; the price list can be removed with no trace.
- **Plain HTTP stays**; no extra access controls unless asked. Passwords: at least 8 characters (050).
- **Declined or set aside by the owner:** marking chats as read at WhatsApp ("don't worry about this anymore"); backups ("not now"); importing phone contacts; ignore rules for settings files in git (audit item DX-06). Deferred product areas: section 1.
- **The WhatsApp bridge is unofficial:** spare numbers only, no bulk messaging; never run two copies of one number's session.

---

## 14. Open items

- **人设 (persona for translated replies)** — the owner wants it to shape translated replies and to follow the design of the wa-translation browser plugin; waiting for a screenshot or a description of that plugin's 人设 screen. Today 回复语气 (reply tone) and 业务说明 (business description) on the AI 能力 page do this job.
- **A decision for the owner (SEC-05)** — a supervisor's password reset returns the temporary password, so a supervisor could sign in as the employee, while the supervisor page is described as read-only.
- **Audit findings not planned** — section 11 (rows without "Fixed" or "Declined").
- **A rare scroll miss** — after a picture with a translated caption the conversation stayed short of its end in 1 of 44 runs after plan 071; the cause was not found.

---

## 15. Glossary (UI words)

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
| 客户等级 / 客户状态 | customer tier / customer status |
| 已成交 / 弃单 / 自然线索 | won / dropped / organic lead |
| 新增客户 · 初步需求 · 新建客户档案 | add customer (by hand) · initial need · new customer profile (preview placeholder) |
| 画像与跟进 · 结构化客户需求画像 · 保存画像 | persona & follow-up (profile tab) · structured needs persona · save persona |
| 意向等级 · 高意向 / 中意向 / 了解中 · 请选择 | intent level · high / medium / exploring · please choose |
| 订单追踪 · 待发货 / 已发货 / 已签收 / 异常 | order tracking · awaiting shipment / shipped / delivered / exception |
| 聊天记录 · 移入聊天记录 | chat records · move a conversation into the records |
| 号码管理 · 在线聊天 · 账号列表 · 移除账号 | number management · live chat · account list · remove account |
| 扫码绑定 · 解除绑定 | link by QR code · unlink |
| 客户语言 · 译文语言 · 译文 | customer's language · reading language · translation |
| 发送前翻译 · 发送保护 · 待翻译 · 发送译文 · 发送原文 | translate before sending · send guard · to translate · send translation · send as typed |
| 会话消息翻译 · 语音转文字 · 转文字 | conversation translation · voice to text · transcribe |
| 回复语气 · 业务说明 | reply tone · business description |
| 价格表 · 售价币种 · 彻底删除价格表 | price list · price currency · remove the price list for good |
| 报价 · 已选 N 项 · 确认 · 确认报价 | quote · N selected · confirm · confirm quote |
| 数量 · 单价 · 金额 · 合计 · 删除 · 返回列表 · 放入消息框 | quantity · unit price · amount · total · delete · back to the list · put into the message box |
| 置顶 / 取消置顶 | pin / unpin (a chat) |
| 素材管理 | materials management (hidden, no route) |
| 人设 | persona for translated replies (a feature of other plugins; planned, see section 14) |
| 发送中 · 结果待确认 · 未发送 | sending · outcome to be confirmed · not sent |
| 修改暂未保存到服务器，正在重试… | changes not yet saved to the server, retrying… |
| 数据已在别处更新 / 登录已失效 / 已在其他页面打开 · 刷新页面 | data changed elsewhere / session expired / opened in another page · reload the page |
