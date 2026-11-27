// The provisioner: the one part of the platform that may tell Docker what to do. It creates, starts and stops
// the two containers of a sub-site — the sub-site's server and its own OpenWA — after a fixed recipe; the only
// thing a caller chooses is the sub-site's id. Run it in a container that has the Docker socket, on the
// platform's own network and with no published port:
//   node site-provisioner.cjs
// It answers the first server of the platform ("master"), which proves itself with a shared secret:
//   GET  /health                is the provisioner there? (the one address that needs no secret)
//   GET  /sites                 every sub-site with its state, and how much room is left
//   POST /sites  { id }         a new sub-site (202, the work goes on in the background) — or 409 with the reason
//   POST /sites/<id>/start      POST /sites/<id>/stop
//   POST /sites/<id>/remove     the sub-site deleted for good (see remove below)
// Settings (environment):
//   WA_SCRM_PROVISIONER_SECRET_FILE   file with the shared secret, at least 32 characters (required)
//   WA_SCRM_SERVER_IMAGE              image of the sub-site's server (required)
//   WA_SCRM_OPENWA_IMAGE              image of OpenWA, pinned by digest (required)
//   WA_SCRM_OPENWA_WEB_VERSION        the WhatsApp Web build each OpenWA made from now on loads (optional; empty:
//                                     OpenWA's own choice), e.g. 2.3000.1055837054-alpha — see openwaSpec below
//   WA_SCRM_HOST_DATA_DIR             the platform's data folder as the Docker host names it (required)
//   WA_SCRM_DATA_DIR                  the same folder as this process sees it (required)
//   WA_SCRM_HOST_AI_ENV               the model service's settings file on the host (optional)
//   WA_SCRM_NETWORK (wa-scrm)  WA_SCRM_PROVISIONER_PORT (8090)  WA_SCRM_DOCKER_SOCKET (/var/run/docker.sock)
//   WA_SCRM_MAX_SITES (4)  WA_SCRM_MIN_FREE_MB (1400)  WA_SCRM_OPENWA_MEMORY_MB (1536)  WA_SCRM_SERVER_MEMORY_MB (256)
//   WA_SCRM_RUN_AS (1000:1000)        the user the sub-sites' servers run as; owner of the files in the data folder
// A log line carries the action, the sub-site and the outcome; never a key or a secret.
// The first server's side is here as well (client, clientFromEnv): what it asks, and how it reads the answers.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const SITE_ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
// Names the platform uses for its own containers; no sub-site may be called so.
const RESERVED = ['master', 'gateway', 'provisioner'];
const MAX_BODY = 4096;
const HEALTH_WAIT_MS = 180000;
// How long a sub-site that is deleted is waited for: its OpenWA to come up, and a number's connection to be up.
const SIGN_OUT_WAIT_MS = 30000;
// How long the signing out of a deleted sub-site's numbers may take in all — the first server waits for less
// than two minutes —, how many of its sessions are looked at, and how much of an answer of its OpenWA is read.
const SIGN_OUT_BUDGET_MS = 60000;
const SESSIONS_AT_MOST = 20;
const ANSWER_MAX = 1024 * 1024;
const ENGINE_TIMEOUT_MS = 120000;
const STATUS = { 'invalid-request': 400, 'not-allowed': 401, 'unknown-site': 404, 'not-found': 404, 'method-not-allowed': 405, exists: 409, full: 409, 'low-memory': 409, busy: 409 };
const problem = code => Object.assign(new Error(code), { code });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// One call to the Docker Engine over its socket. Resolves to { status, body }.
function engine(socketPath) {
  return (method, pathname, body) => new Promise((resolve, reject) => {
    const data = body === undefined ? null : Buffer.from(JSON.stringify(body));
    const req = http.request({ socketPath, method, path: pathname, headers: data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {} }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch {}
        resolve({ status: res.statusCode, body: parsed });
      });
      // An answer that breaks off must not leave its caller waiting for good.
      res.on('error', reject);
      res.on('close', () => { if (!res.complete) reject(new Error('the Docker Engine ended its answer early')); });
    });
    req.setTimeout(ENGINE_TIMEOUT_MS, () => req.destroy(new Error('the Docker Engine did not answer in time')));
    req.on('error', reject);
    req.end(data || undefined);
  });
}
// Where a sub-site's OpenWA is reached on the platform's network: by the name of its container.
const openwaAddress = id => `http://wa-scrm-openwa-${id}:2785`;

// config: see the settings above. docker: (method, path, body) → { status, body }. freeMb: () → the host's free
// memory. openwaUrl: id → the address of a sub-site's OpenWA; wait, healthWaitMs and signOutWaitMs: how the
// provisioner waits for an OpenWA to come up, and for a number's connection when it is deleted; signOutBudgetMs:
// how long the signing out may take in all (all replaceable for tests).
function create({ config, docker, freeMb, openwaUrl = openwaAddress, wait = sleep, healthWaitMs = HEALTH_WAIT_MS, signOutWaitMs = SIGN_OUT_WAIT_MS, signOutBudgetMs = SIGN_OUT_BUDGET_MS }) {
  const names = id => ({ server: `wa-scrm-site-${id}`, openwa: `wa-scrm-openwa-${id}`, volume: `wa-scrm-openwa-${id}`, settings: `openwa-${id}.env` });
  const labels = (id, part) => ({ 'wa-scrm.site': id, 'wa-scrm.part': part });
  // What is being made or started right now ('working'), what is being stopped ('stopping') or deleted
  // ('removing'), and what went wrong the last time (the reason it failed), by id.
  const work = new Map();
  const busy = id => ['working', 'stopping', 'removing'].includes(work.get(id));
  // Does this part take memory: it runs, or Docker is starting it again this moment.
  const up = part => part?.state === 'running' || part?.state === 'restarting';

  const ok = (answer, ...fine) => { if (!fine.includes(answer.status)) throw Object.assign(problem('engine'), { detail: `${answer.status} ${answer.body?.message || ''}`.trim() }); return answer; };

  async function containers() {
    const list = ok(await docker('GET', '/containers/json?all=1&filters=' + encodeURIComponent(JSON.stringify({ label: ['wa-scrm.site'] }))), 200).body;
    const sites = new Map();
    for (const c of list) {
      const id = c.Labels['wa-scrm.site'], part = c.Labels['wa-scrm.part'];
      if (!SITE_ID.test(id) || !['server', 'openwa'].includes(part)) continue;
      if (!sites.has(id)) sites.set(id, {});
      sites.get(id)[part] = { state: c.State, health: /\(healthy\)/.test(c.Status) ? 'healthy' : /\(unhealthy\)/.test(c.Status) ? 'unhealthy' : /\(health: starting\)/.test(c.Status) ? 'starting' : '' };
    }
    return sites;
  }
  // ready: both run and OpenWA answers. starting: on the way there. stopping: on the way down. removing: being
  // deleted. stopped: its OpenWA is there and does not run, and no server runs (the server may be gone: an
  // upgrade takes it away, and the next start makes it anew). failed: the last attempt to make or start it went
  // wrong, or a part is missing.
  function stateOf(id, parts) {
    if (work.get(id) === 'working') return 'starting';
    if (work.get(id) === 'stopping') return 'stopping';
    if (work.get(id) === 'removing') return 'removing';
    const { server, openwa } = parts || {};
    if (server?.state === 'running' && openwa?.state === 'running') return openwa.health === 'healthy' ? 'ready' : openwa.health === 'unhealthy' ? 'failed' : 'starting';
    if (work.has(id)) return 'failed';
    if (openwa && !up(openwa) && !up(server)) return 'stopped';
    return 'failed';
  }
  // How many sub-sites take a place: those whose OpenWA runs, and those that are being made or started.
  const taken = (sites, but) => [...new Set([...[...sites].filter(([, parts]) => up(parts.openwa)).map(([id]) => id), ...[...work].filter(([, state]) => state === 'working').map(([id]) => id)])].filter(id => id !== but).length;
  async function list() {
    const sites = await containers();
    for (const id of work.keys()) if (!sites.has(id)) sites.set(id, {});
    const running = taken(sites), free = Math.floor(freeMb());
    return {
      sites: [...sites].sort(([a], [b]) => (a < b ? -1 : 1)).map(([id, parts]) => ({ id, state: stateOf(id, parts), ...(work.has(id) && !busy(id) ? { reason: work.get(id) } : {}) })),
      room: { max: config.maxSites, running, freeMb: free, minFreeMb: config.minFreeMb, canStart: running < config.maxSites && free >= config.minFreeMb },
    };
  }
  // Refuses when the sub-site would be one too many, or would leave the host with too little memory. The place
  // is taken before the question is asked (see claim below), so two requests at once cannot both get the last one.
  async function room(id) {
    if (taken(await containers(), id) >= config.maxSites) throw problem('full');
    if (freeMb() < config.minFreeMb) throw problem('low-memory');
  }
  async function claim(id, check) {
    const before = work.get(id);
    work.set(id, 'working');
    try {
      await check();
    } catch (error) {
      if (before === undefined) work.delete(id);
      else work.set(id, before);
      throw error;
    }
  }

  // The machine's WhatsApp Web build (WA_SCRM_OPENWA_WEB_VERSION), when it has one, goes to every OpenWA made from
  // now on: since late November 2026 WhatsApp sends a browser that is not signed in to a new /login/ page that
  // OpenWA 0.31.0 does not know, and a new number then gets no QR code; an older build still shows one. An OpenWA
  // keeps the build it was made with.
  const openwaSpec = (id, masterKey) => ({
    Image: config.openwaImage,
    Env: ['NODE_ENV=production', 'TZ=UTC', 'HOME=/tmp', 'XDG_CONFIG_HOME=/tmp/.config', 'XDG_CACHE_HOME=/tmp/.cache', 'PORT=2785', 'ENGINE_TYPE=whatsapp-web.js', 'AUTO_START_SESSIONS=true',
      `SSRF_ALLOWED_HOSTS=${names(id).server}`, 'WEBHOOK_MEDIA_INLINE_MAX_BYTES=0', 'RESOLVE_LID_TO_PHONE=true',
      ...(config.openwaWebVersion ? [`WWEBJS_WEB_VERSION=${config.openwaWebVersion}`] : []), ...(masterKey ? [`API_MASTER_KEY=${masterKey}`] : [])],
    Labels: labels(id, 'openwa'),
    HostConfig: {
      NetworkMode: config.network, RestartPolicy: { Name: 'unless-stopped' }, Memory: config.openwaMemoryMb * 1048576, PidsLimit: 2048, ReadonlyRootfs: true,
      CapDrop: ['ALL'], CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'KILL', 'SETGID', 'SETUID'], SecurityOpt: ['no-new-privileges:true'], Tmpfs: { '/tmp': '' },
      Mounts: [{ Type: 'volume', Source: names(id).volume, Target: '/app/data' }],
      LogConfig: { Type: 'json-file', Config: { 'max-size': '10m', 'max-file': '3' } },
    },
  });
  const serverSpec = id => ({
    Image: config.serverImage,
    Cmd: ['node', 'work/wa-replica/serve.cjs', '8080'],
    User: config.runAs,
    Env: ['WA_SCRM_DATA_DIR=/data', `WA_SCRM_SITE_ID=${id}`, `WA_SCRM_OPENWA_ENV=/data/${names(id).settings}`, 'WA_SCRM_LISTEN=0.0.0.0', ...(config.hostAiEnv ? ['WA_SCRM_AI_ENV=/run/wa-scrm/ai.env'] : [])],
    Labels: labels(id, 'server'),
    HostConfig: {
      NetworkMode: config.network, RestartPolicy: { Name: 'unless-stopped' }, Memory: config.serverMemoryMb * 1048576, PidsLimit: 256, ReadonlyRootfs: true, Init: true,
      CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'], Tmpfs: { '/tmp': '' },
      Mounts: [{ Type: 'bind', Source: config.hostDataDir, Target: '/data' }, ...(config.hostAiEnv ? [{ Type: 'bind', Source: config.hostAiEnv, Target: '/run/wa-scrm/ai.env', ReadOnly: true }] : [])],
      LogConfig: { Type: 'json-file', Config: { 'max-size': '10m', 'max-file': '3' } },
    },
  });

  async function healthy(id, patience = healthWaitMs) {
    for (const end = Date.now() + patience; Date.now() < end;) {
      const state = ok(await docker('GET', `/containers/${names(id).openwa}/json`), 200).body.State;
      if (state.Health?.Status === 'healthy') return;
      if (!state.Running) throw problem('openwa-stopped');
      await wait(2000);
    }
    throw problem('openwa-not-healthy');
  }
  // The settings file of a sub-site's WhatsApp link: where its OpenWA is, a key restricted to operating it, and
  // the secret its deliveries are signed with. Private to the user the servers run as.
  async function settings(id, masterKey) {
    const made = await fetch(openwaUrl(id) + '/api/auth/api-keys', { method: 'POST', headers: { 'X-API-Key': masterKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `wa-scrm-${id}-${Date.now().toString(36)}`, role: 'operator' }), signal: AbortSignal.timeout(20000) });
    const key = made.status === 201 ? (await made.json()).apiKey : '';
    if (!key) throw problem('openwa-key');
    const file = path.join(config.dataDir, names(id).settings), [uid, gid] = config.runAs.split(':').map(Number);
    fs.writeFileSync(file, `OPENWA_BASE_URL=${openwaUrl(id)}\nOPENWA_API_KEY=${key}\nOPENWA_HOOK_URL=http://${names(id).server}:8080/api/wa/hook\nOPENWA_HOOK_SECRET=${crypto.randomBytes(32).toString('hex')}\n`, { mode: 0o600 });
    // The file belongs to the user the servers run as; that is this process itself unless it runs as root.
    if (process.getuid() === 0) fs.chownSync(file, uid, gid);
  }
  // Makes what is missing of a sub-site and starts it. A sub-site whose OpenWA has its data and whose settings
  // file is there already (one that was moved here, or whose containers were removed) keeps both. One whose
  // making stopped half-way is finished: its OpenWA still has the key it was started with.
  async function build(id) {
    const n = names(id), parts = (await containers()).get(id) || {};
    const kept = fs.existsSync(path.join(config.dataDir, n.settings));
    if (!parts.openwa) {
      // Whether its OpenWA has data already: the volume is there (200) or not (404). Any other answer is the
      // engine's trouble, and nothing is made or taken away on it.
      const volume = ok(await docker('GET', `/volumes/${n.volume}`), 200, 404), fresh = volume.status === 404;
      if (!fresh && !kept) throw problem('settings-missing');
      if (fresh && kept) throw problem('data-missing');
      const masterKey = kept ? '' : crypto.randomBytes(36).toString('base64url');
      if (fresh) ok(await docker('POST', '/volumes/create', { Name: n.volume, Labels: labels(id, 'openwa') }), 201);
      try {
        ok(await docker('POST', `/containers/create?name=${n.openwa}`, openwaSpec(id, masterKey)), 201);
      } catch (error) {
        // A volume made a moment ago for a container that then cannot be made — the image is not there — holds
        // nothing. Left behind it would pass for data whose settings are missing, and the id could never be used.
        if (fresh) await docker('DELETE', `/volumes/${n.volume}`).catch(() => {});
        throw error;
      }
      ok(await docker('POST', `/containers/${n.openwa}/start`), 204, 304);
      await healthy(id);
      if (!kept) await settings(id, masterKey);
    } else {
      const env = ok(await docker('GET', `/containers/${n.openwa}/json`), 200).body.Config?.Env || [];
      const masterKey = (env.find(line => line.startsWith('API_MASTER_KEY=')) || '').slice('API_MASTER_KEY='.length);
      if (!kept && !masterKey) throw problem('settings-missing');
      ok(await docker('POST', `/containers/${n.openwa}/start`), 204, 304);
      await healthy(id);
      if (!kept) await settings(id, masterKey);
    }
    if (!parts.server) ok(await docker('POST', `/containers/create?name=${n.server}`, serverSpec(id)), 201);
    ok(await docker('POST', `/containers/${n.server}/start`), 204, 304);
  }
  // Runs build in the background; what it comes to is read from the list.
  function begin(id, what) {
    work.set(id, 'working');
    build(id).then(() => { work.delete(id); console.log(`provisioner ${what} ok site=${id}`); }, error => {
      work.set(id, error.code || 'error');
      console.error(`provisioner ${what} failed site=${id} error=${error.code || error.name}${error.detail ? ' detail=' + error.detail : ''}`);
    });
  }

  // The numbers of a sub-site signed out at WhatsApp — so that the phone lists them no more — and their sessions
  // taken away, asked of its OpenWA with the key of the sub-site's settings file. An OpenWA that does not run is
  // started for this when the host has the memory to spare. Resolves to true (every number that was linked is
  // signed out), false (one could not be, or OpenWA could not be asked) or null (no number was linked).
  async function signOut(id, parts, volume) {
    const n = names(id), file = path.join(config.dataDir, n.settings), until = Date.now() + signOutBudgetMs, left = () => until - Date.now();
    if (!parts.openwa) return volume ? false : null;
    // The settings file is read when it is a plain file of a settings file's size: anything else in its place —
    // a pipe would never end — holds no key.
    const stat = fs.lstatSync(file, { throwIfNoEntry: false });
    const key = stat?.isFile() && stat.size <= 4096 ? ((fs.readFileSync(file, 'utf8').match(/^OPENWA_API_KEY=(.+)$/m) || [])[1] || '').trim() : '';
    if (!key) return false;
    if (!up(parts.openwa)) {
      if (freeMb() < config.minFreeMb) return false;
      ok(await docker('POST', `/containers/${n.openwa}/start`), 204, 304);
      try {
        await healthy(id, Math.min(signOutWaitMs, left()));
      } catch {
        return false;
      }
    }
    // Each call has the time that is left — twenty seconds at most —, and an answer is read up to ANSWER_MAX.
    const openwaAsk = async (method, pathname) => {
      if (left() <= 0) return { status: 0, body: null };
      try {
        const answer = await fetch(openwaUrl(id) + pathname, { method, headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(Math.min(20000, left())) });
        const chunks = [];
        let size = 0;
        for await (const chunk of answer.body || []) {
          size += chunk.length;
          if (size > ANSWER_MAX) return { status: 0, body: null };
          chunks.push(chunk);
        }
        let body = null;
        try {
          body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        } catch {}
        return { status: answer.status, body };
      } catch {
        return { status: 0, body: null };
      }
    };
    const listed = await openwaAsk('GET', '/api/sessions');
    if (listed.status !== 200 || !Array.isArray(listed.body)) return false;
    let linked = 0, out = 0;
    for (const session of listed.body.slice(0, SESSIONS_AT_MOST)) {
      if (typeof session?.id !== 'string' || !/^[A-Za-z0-9-]{1,64}$/.test(session.id)) continue;
      if (session.phone) {
        linked += 1;
        // A linked number is signed out once its connection is up again — while there is time left.
        for (const end = Date.now() + Math.min(signOutWaitMs, left()); session.status !== 'ready' && Date.now() < end;) {
          await wait(2000);
          session.status = (await openwaAsk('GET', `/api/sessions/${session.id}`)).body?.status;
        }
        const logout = await openwaAsk('POST', `/api/sessions/${session.id}/logout`);
        if (logout.status >= 200 && logout.status < 300) out += 1;
      }
      await openwaAsk('DELETE', `/api/sessions/${session.id}`);
    }
    // Sessions beyond those looked at may hold a number as well: then it cannot be said that every one is out.
    if (listed.body.length > SESSIONS_AT_MOST) return false;
    return linked ? out === linked : null;
  }
  // The sub-site deleted for good: its numbers signed out, its two containers, the data of its OpenWA, its
  // settings file and its data files — the document of its customers and chats, its WhatsApp store and media.
  // What is not there is skipped; the names come from the id alone, so nothing of another sub-site is touched.
  async function remove(id) {
    const n = names(id), parts = (await containers()).get(id) || {};
    const files = [n.settings, ...['site', 'wa'].flatMap(kind => ['', '-wal', '-shm'].map(end => `${kind}-${id}.db${end}`)), `wa-media-${id}`].map(name => path.join(config.dataDir, name));
    const volume = ok(await docker('GET', `/volumes/${n.volume}`), 200, 404).status === 200;
    if (!parts.server && !parts.openwa && !volume && !files.some(file => fs.existsSync(file))) throw problem('unknown-site');
    const signedOut = await signOut(id, parts, volume);
    for (const name of [n.server, n.openwa]) ok(await docker('DELETE', `/containers/${name}?force=true`), 204, 404);
    if (volume) ok(await docker('DELETE', `/volumes/${n.volume}`), 204, 404);
    for (const file of files) fs.rmSync(file, { recursive: true, force: true });
    return signedOut;
  }

  const known = id => { if (typeof id !== 'string' || !SITE_ID.test(id) || RESERVED.includes(id)) throw problem('invalid-request'); return id; };
  const routes = {
    'GET /sites': async () => list(),
    'POST /sites': async body => {
      const id = known(body.id);
      if (busy(id)) throw problem('busy');
      await claim(id, async () => {
        if ((await containers()).has(id) || fs.existsSync(path.join(config.dataDir, names(id).settings))) throw problem('exists');
        await room(id);
      });
      begin(id, 'create');
      return { status: 202, body: { id, state: 'starting' } };
    },
    'POST /sites/start': async (body, id) => {
      known(id);
      if (busy(id)) throw problem('busy');
      await claim(id, async () => {
        const parts = (await containers()).get(id);
        if (!parts && !fs.existsSync(path.join(config.dataDir, names(id).settings))) throw problem('unknown-site');
        if (!up(parts?.openwa)) await room(id);
      });
      begin(id, 'start');
      return { status: 202, body: { id, state: 'starting' } };
    },
    'POST /sites/stop': async (body, id) => {
      known(id);
      if (busy(id)) throw problem('busy');
      // While it is being stopped — which takes its time — a sub-site is busy like one that is being made:
      // nothing else is begun with it.
      const before = work.get(id);
      work.set(id, 'stopping');
      try {
        const parts = (await containers()).get(id);
        if (!parts) throw problem('unknown-site');
        // The server first, so that nothing is sent to an OpenWA that is going; OpenWA gets the time it needs to
        // put its session away.
        if (parts.server) ok(await docker('POST', `/containers/${names(id).server}/stop?t=10`), 204, 304);
        if (parts.openwa) ok(await docker('POST', `/containers/${names(id).openwa}/stop?t=75`), 204, 304);
      } catch (error) {
        if (before === undefined) work.delete(id);
        else work.set(id, before);
        throw error;
      }
      work.delete(id);
      console.log(`provisioner stop ok site=${id}`);
      return { status: 200, body: { id, state: 'stopped' } };
    },
    'POST /sites/remove': async (body, id) => {
      known(id);
      if (busy(id)) throw problem('busy');
      // While it is being deleted a sub-site is busy: nothing else is begun with it.
      const before = work.get(id);
      work.set(id, 'removing');
      let signedOut;
      try {
        signedOut = await remove(id);
      } catch (error) {
        // When nothing of it was there, a mark of what went wrong with it before goes as well.
        if (error.code === 'unknown-site' || before === undefined) work.delete(id);
        else work.set(id, before);
        throw error;
      }
      work.delete(id);
      console.log(`provisioner remove ok site=${id} signed-out=${signedOut === null ? 'none' : signedOut ? 'yes' : 'no'}`);
      return { status: 200, body: { id, state: 'removed', signedOut } };
    },
  };

  async function handle(req, res) {
    const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    try {
      if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true });
      const given = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer /, '')), secret = Buffer.from(config.secret);
      if (given.length !== secret.length || !crypto.timingSafeEqual(given, secret)) throw problem('not-allowed');
      // The address is looked at only now; what is no address is nothing the provisioner knows.
      let pathname;
      try { pathname = new URL(req.url, 'http://localhost').pathname; } catch { throw problem('not-found'); }
      const named = pathname.match(/^\/sites\/([^/]+)\/(start|stop|remove)$/);
      const route = routes[`${req.method} ${named ? '/sites/' + named[2] : pathname}`];
      if (!route) throw problem(pathname === '/sites' || named ? 'method-not-allowed' : 'not-found');
      let body = {};
      if (req.method === 'POST') {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) throw problem('invalid-request'); chunks.push(chunk); }
        try { body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; } catch { throw problem('invalid-request'); }
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw problem('invalid-request');
      }
      const answer = await route(body, named ? named[1] : undefined);
      return send(answer.status || 200, answer.body || answer);
    } catch (error) {
      if (!res.headersSent && Object.hasOwn(STATUS, error.code)) return send(STATUS[error.code], { error: error.code });
      console.error(`provisioner request failed route=${req.method} ${String(req.url).split('?')[0]} error=${error.code || error.name}${error.detail ? ' detail=' + error.detail : ''}`);
      if (!res.headersSent) send(500, { error: 'internal' });
    }
  }
  return { handle, list };
}

// The first server's side: asks the provisioner, with the shared secret. An answer that is no success is thrown
// as a problem named after the reason — workspace-exists, -full, -low-memory, -busy, -unknown-site — and
// everything else (no answer, a secret that does not fit, an answer nobody expects) as workspace-unavailable.
function client({ url, secret, timeoutMs = 20000, listTimeoutMs = 5000, stopTimeoutMs = 110000 }) {
  async function ask(method, pathname, sent, patience = timeoutMs) {
    let status = 0, answer = null;
    try {
      const response = await fetch(url + pathname, { method, headers: { Authorization: 'Bearer ' + secret, ...(sent ? { 'Content-Type': 'application/json' } : {}) }, body: sent ? JSON.stringify(sent) : undefined, signal: AbortSignal.timeout(patience) });
      status = response.status;
      answer = await response.json();
    } catch {}
    if ((status === 200 || status === 202) && answer && typeof answer === 'object') return answer;
    throw problem(['exists', 'full', 'low-memory', 'busy', 'unknown-site'].includes(answer?.error) ? 'workspace-' + answer.error : 'workspace-unavailable');
  }
  const named = (id, action) => `/sites/${encodeURIComponent(id)}/${action}`;
  return {
    // Every sub-site with its state, and the room that is left. Asked for a page that waits: not for long.
    list: async () => {
      const answer = await ask('GET', '/sites', undefined, listTimeoutMs);
      if (!Array.isArray(answer.sites) || !answer.room) throw problem('workspace-unavailable');
      return answer;
    },
    make: id => ask('POST', '/sites', { id }),
    start: id => ask('POST', named(id, 'start')),
    // Stopping takes as long as OpenWA needs to put its session away.
    stop: id => ask('POST', named(id, 'stop'), undefined, stopTimeoutMs),
    // Deleting takes as long as signing its numbers out: { id, state: 'removed', signedOut: true | false | null }.
    remove: id => ask('POST', named(id, 'remove'), undefined, stopTimeoutMs),
  };
}
// The first server's client from its environment — or null where the platform makes no sub-sites:
//   WA_SCRM_PROVISIONER_URL           where the provisioner is reached, e.g. http://wa-scrm-provisioner:8090
//   WA_SCRM_PROVISIONER_SECRET_FILE   the file with the shared secret
function clientFromEnv(env = process.env) {
  if (!env.WA_SCRM_PROVISIONER_URL) return null;
  if (!/^https?:\/\/[^/\s]+$/.test(env.WA_SCRM_PROVISIONER_URL)) throw new Error('WA_SCRM_PROVISIONER_URL must be an address like http://host:port');
  if (!env.WA_SCRM_PROVISIONER_SECRET_FILE) throw new Error('WA_SCRM_PROVISIONER_SECRET_FILE is not set');
  const secret = fs.readFileSync(env.WA_SCRM_PROVISIONER_SECRET_FILE, 'utf8').trim();
  if (secret.length < 32) throw new Error('the shared secret must be at least 32 characters long');
  return client({ url: env.WA_SCRM_PROVISIONER_URL, secret });
}

function configFromEnv(env = process.env) {
  const need = name => { if (!env[name]) throw new Error(name + ' is not set'); return env[name]; };
  const secret = fs.readFileSync(need('WA_SCRM_PROVISIONER_SECRET_FILE'), 'utf8').trim();
  if (secret.length < 32) throw new Error('the shared secret must be at least 32 characters long');
  const runAs = env.WA_SCRM_RUN_AS || '1000:1000';
  if (!/^\d+:\d+$/.test(runAs)) throw new Error('WA_SCRM_RUN_AS must be <uid>:<gid>');
  // A WhatsApp Web build is three numbers with dots between them, maybe followed by a word: 2.3000.1055837054-alpha.
  const webVersion = env.WA_SCRM_OPENWA_WEB_VERSION || '';
  if (webVersion && !/^\d+\.\d+\.\d+(-[a-z]+)?$/.test(webVersion)) throw new Error('WA_SCRM_OPENWA_WEB_VERSION must be a WhatsApp Web build like 2.3000.1055837054-alpha');
  // A number among the settings: its default when it is not set, else a whole number — 0 is one, and is meant.
  const number = (name, standard) => {
    if (env[name] === undefined || env[name] === '') return standard;
    if (!/^\d+$/.test(env[name])) throw new Error(name + ' must be a whole number');
    return Number(env[name]);
  };
  return {
    secret, runAs, serverImage: need('WA_SCRM_SERVER_IMAGE'), openwaImage: need('WA_SCRM_OPENWA_IMAGE'), hostDataDir: need('WA_SCRM_HOST_DATA_DIR'), dataDir: need('WA_SCRM_DATA_DIR'),
    hostAiEnv: env.WA_SCRM_HOST_AI_ENV || '', network: env.WA_SCRM_NETWORK || 'wa-scrm', openwaWebVersion: webVersion,
    maxSites: number('WA_SCRM_MAX_SITES', 4), minFreeMb: number('WA_SCRM_MIN_FREE_MB', 1400), openwaMemoryMb: number('WA_SCRM_OPENWA_MEMORY_MB', 1536), serverMemoryMb: number('WA_SCRM_SERVER_MEMORY_MB', 256),
  };
}
// The host's free memory in MB, as the kernel reckons what can be had without swapping.
const hostFreeMb = () => Number(fs.readFileSync('/proc/meminfo', 'utf8').match(/^MemAvailable:\s+(\d+) kB/m)[1]) / 1024;

if (require.main === module) {
  const config = configFromEnv();
  const provisioner = create({ config, docker: engine(process.env.WA_SCRM_DOCKER_SOCKET || '/var/run/docker.sock'), freeMb: hostFreeMb });
  const server = http.createServer(provisioner.handle);
  server.listen(Number(process.env.WA_SCRM_PROVISIONER_PORT) || 8090, '0.0.0.0', () => console.log('provisioner listening port=' + server.address().port));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}

module.exports = { create, engine, configFromEnv, client, clientFromEnv, openwaAddress, SITE_ID, RESERVED };
