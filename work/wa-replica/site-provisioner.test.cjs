// Tests of the provisioner against a stand-in Docker Engine (listening on a socket in the test's own folder) and a
// stand-in OpenWA. No real container is made.
// Run with Node 22.13 or newer:  node --test work/wa-replica/site-provisioner.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { create, engine, configFromEnv, openwaAddress, RESERVED } = require('./site-provisioner.cjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-scrm-prov-'));
// The path of a socket can be about a hundred characters long; the folder for temporary files may lie deeper.
const socketDir = Buffer.byteLength(tmp) < 80 ? tmp : fs.mkdtempSync('/tmp/wa-scrm-prov-');
const socket = path.join(socketDir, 'docker.sock'), dataDir = path.join(tmp, 'data');
fs.mkdirSync(dataDir);
const SECRET = 'a-shared-secret-of-forty-characters-0000';
const config = { secret: SECRET, runAs: `${process.getuid()}:${process.getgid()}`, serverImage: 'wa-scrm-server:test', openwaImage: 'openwa:test@sha256:abc', hostDataDir: '/srv/wa-scrm/data', dataDir, hostAiEnv: '/srv/wa-scrm/ai.env', network: 'wa-scrm', maxSites: 2, minFreeMb: 1400, openwaMemoryMb: 1536, serverMemoryMb: 256 };
const logged = [];
for (const level of ['log', 'error']) {
  const original = console[level];
  console[level] = (...args) => { logged.push(args.join(' ')); if (!String(args[0]).startsWith('provisioner ')) original(...args); };
}

// ---- the stand-in Docker Engine ----
// containers: name → { spec, state: 'created' | 'running' | 'exited', polls }. calls: what was asked, in order.
// mood: how an OpenWA behaves after it was started — 'ok' (healthy at the second look), 'never', 'dies'.
const containers = new Map(), volumes = new Set(), calls = [];
let mood = 'ok', free = 4000;
const isOpenwa = c => c.spec.Labels['wa-scrm.part'] === 'openwa';
const health = c => (!isOpenwa(c) ? '' : mood === 'ok' && c.polls >= 2 ? 'healthy' : 'starting');
const fake = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://docker'), chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : undefined;
    const send = (status, answer) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(answer === undefined ? '' : JSON.stringify(answer)); };
    const one = url.pathname.match(/^\/containers\/([^/]+)\/(start|stop|json)$/);
    if (req.method !== 'GET') calls.push(`${req.method} ${url.pathname}${url.search.startsWith('?name=') ? url.search : ''}`);
    if (req.method === 'GET' && url.pathname === '/containers/json') {
      return send(200, [...containers].map(([name, c]) => ({ Id: name, Names: ['/' + name], Labels: c.spec.Labels, State: c.state, Status: c.state === 'running' ? `Up 3 seconds${health(c) ? ` (${health(c) === 'healthy' ? 'healthy' : 'health: starting'})` : ''}` : c.state === 'exited' ? 'Exited (0) 2 seconds ago' : 'Created' })));
    }
    if (req.method === 'POST' && url.pathname === '/containers/create') {
      const name = url.searchParams.get('name');
      if (containers.has(name)) return send(409, { message: 'Conflict. The container name is already in use' });
      if (body.Image === 'no-such-image') return send(404, { message: 'No such image: no-such-image' });
      containers.set(name, { spec: body, state: 'created', polls: 0 });
      return send(201, { Id: name });
    }
    if (one) {
      const c = containers.get(one[1]);
      if (!c) return send(404, { message: 'No such container: ' + one[1] });
      if (one[2] === 'start') { if (c.state === 'running') return send(304); Object.assign(c, { state: 'running', polls: 0 }); return send(204); }
      if (one[2] === 'stop') { if (c.state !== 'running') return send(304); c.state = 'exited'; return send(204); }
      c.polls += 1;
      if (isOpenwa(c) && mood === 'dies' && c.polls >= 2) c.state = 'exited';
      return send(200, { Config: { Env: c.spec.Env }, State: { Running: c.state === 'running', Health: isOpenwa(c) ? { Status: health(c) } : undefined } });
    }
    if (url.pathname === '/volumes/create') { volumes.add(body.Name); return send(201, { Name: body.Name }); }
    const volume = url.pathname.match(/^\/volumes\/([^/]+)$/);
    if (volume) return send(volumes.has(volume[1]) ? 200 : 404, volumes.has(volume[1]) ? { Name: volume[1] } : { message: 'no such volume' });
    return send(404, { message: 'page not found' });
  });
});
// ---- the stand-in OpenWA: gives a restricted key to whoever shows the key its container was started with ----
const keys = [];
const openwa = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const started = [...containers.values()].filter(isOpenwa).flatMap(c => c.spec.Env).filter(line => line.startsWith('API_MASTER_KEY=')).map(line => line.slice(15));
    if (req.method !== 'POST' || req.url !== '/api/auth/api-keys' || !started.includes(req.headers['x-api-key'])) { res.writeHead(401); return res.end('{}'); }
    const asked = JSON.parse(Buffer.concat(chunks).toString('utf8')), apiKey = `owa_restricted_${keys.length + 1}_${'k'.repeat(40)}`;
    keys.push({ ...asked, apiKey });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ id: 'k' + keys.length, ...asked, apiKey }));
  });
});

let base, openwaBase;
const provisioner = () => create({ config, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setImmediate(resolve)), healthWaitMs: 150 });
let front;
const call = (pathname, { method = 'GET', body, secret = SECRET } = {}) =>
  fetch(base + pathname, { method, headers: { ...(secret ? { Authorization: 'Bearer ' + secret } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) })
    .then(async response => ({ status: response.status, json: await response.json().catch(() => null) }));
const stateOf = async id => (await call('/sites')).json.sites.find(site => site.id === id);
// Waits until what goes on in the background for a sub-site has come to an end.
async function settled(id) {
  for (let i = 0; i < 400; i++) {
    const site = await stateOf(id);
    if (site && site.state !== 'starting') return site;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error('still starting: ' + id);
}
const changes = from => calls.slice(from);
const settingsOf = id => fs.readFileSync(path.join(dataDir, `openwa-${id}.env`), 'utf8');

test.before(async () => {
  await new Promise(resolve => fake.listen(socket, resolve));
  await new Promise(resolve => openwa.listen(0, '127.0.0.1', resolve));
  openwaBase = `http://127.0.0.1:${openwa.address().port}`;
  front = http.createServer(provisioner().handle);
  await new Promise(resolve => front.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${front.address().port}`;
});
test.after(() => {
  for (const server of [fake, openwa, front]) { server.closeAllConnections(); server.close(); }
  for (const folder of new Set([tmp, socketDir])) fs.rmSync(folder, { recursive: true, force: true });
});

test('nobody without the secret; only what the provisioner knows; an id is a sub-site\'s id and none of the platform\'s own names', async () => {
  assert.deepEqual([(await call('/health', { secret: '' })).json, (await call('/sites', { secret: '' })).json, (await call('/sites', { secret: SECRET + 'x' })).status, (await call('/sites', { secret: SECRET.slice(1) })).status], [{ ok: true }, { error: 'not-allowed' }, 401, 401]);
  assert.deepEqual((await call('/sites')).json, { sites: [], room: { max: 2, running: 0, freeMb: 4000, minFreeMb: 1400, canStart: true } });
  assert.deepEqual([(await call('/nothing')).status, (await call('/sites', { method: 'DELETE' })).status, (await call('/sites/t1/start')).status, (await call('/sites/t1/remove', { method: 'POST' })).status], [404, 405, 405, 404]);
  const from = calls.length;
  for (const id of [undefined, '', 'T1', 'a b', '../x', 'x/y', '-x', 'x'.repeat(41), 7, ['t1'], ...RESERVED]) {
    assert.deepEqual((await call('/sites', { method: 'POST', body: { id } })).json, { error: 'invalid-request' }, JSON.stringify(id));
  }
  for (const pathname of ['/sites/master/start', '/sites/T1/stop', '/sites/' + 'x'.repeat(41) + '/start']) assert.equal((await call(pathname, { method: 'POST' })).status, 400, pathname);
  assert.deepEqual([(await call('/sites', { method: 'POST', body: 'not json' })).status, (await call('/sites', { method: 'POST', body: '[]' })).status, (await call('/sites', { method: 'POST', body: JSON.stringify({ id: 't1', pad: 'x'.repeat(5000) }) })).status], [400, 400, 400]);
  assert.deepEqual([(await call('/sites/nobody/start', { method: 'POST' })).json, (await call('/sites/nobody/stop', { method: 'POST' })).json], [{ error: 'unknown-site' }, { error: 'unknown-site' }]);
  assert.deepEqual(changes(from), [], 'none of this reached the engine with a change');
  assert.equal(openwaAddress('t1'), 'http://wa-scrm-openwa-t1:2785');
});

test('a new sub-site: its OpenWA with a key of the platform\'s choice, a restricted key and a secret in a private settings file, then its server — each after the fixed recipe', async () => {
  const from = calls.length;
  const made = await call('/sites', { method: 'POST', body: { id: 't1', image: 'evil:latest', command: ['sh'], memory: 1 } });
  assert.deepEqual([made.status, made.json], [202, { id: 't1', state: 'starting' }]);
  assert.deepEqual((await call('/sites', { method: 'POST', body: { id: 't1' } })).json, { error: 'busy' }, 'not twice at once');
  assert.deepEqual(await settled('t1'), { id: 't1', state: 'ready' });
  assert.deepEqual(changes(from), ['POST /volumes/create', 'POST /containers/create?name=wa-scrm-openwa-t1', 'POST /containers/wa-scrm-openwa-t1/start', 'POST /containers/create?name=wa-scrm-site-t1', 'POST /containers/wa-scrm-site-t1/start']);
  const own = containers.get('wa-scrm-openwa-t1').spec, masterKey = own.Env.find(line => line.startsWith('API_MASTER_KEY=')).slice(15);
  assert.match(masterKey, /^[A-Za-z0-9_-]{48}$/);
  assert.deepEqual(own, {
    Image: 'openwa:test@sha256:abc',
    Env: ['NODE_ENV=production', 'TZ=UTC', 'HOME=/tmp', 'XDG_CONFIG_HOME=/tmp/.config', 'XDG_CACHE_HOME=/tmp/.cache', 'PORT=2785', 'ENGINE_TYPE=whatsapp-web.js', 'AUTO_START_SESSIONS=true', 'SSRF_ALLOWED_HOSTS=wa-scrm-site-t1', 'WEBHOOK_MEDIA_INLINE_MAX_BYTES=0', 'RESOLVE_LID_TO_PHONE=true', 'API_MASTER_KEY=' + masterKey],
    Labels: { 'wa-scrm.site': 't1', 'wa-scrm.part': 'openwa' },
    HostConfig: {
      NetworkMode: 'wa-scrm', RestartPolicy: { Name: 'unless-stopped' }, Memory: 1536 * 1048576, PidsLimit: 2048, ReadonlyRootfs: true,
      CapDrop: ['ALL'], CapAdd: ['CHOWN', 'DAC_OVERRIDE', 'FOWNER', 'KILL', 'SETGID', 'SETUID'], SecurityOpt: ['no-new-privileges:true'], Tmpfs: { '/tmp': '' },
      Mounts: [{ Type: 'volume', Source: 'wa-scrm-openwa-t1', Target: '/app/data' }], LogConfig: { Type: 'json-file', Config: { 'max-size': '10m', 'max-file': '3' } },
    },
  });
  assert.deepEqual(containers.get('wa-scrm-site-t1').spec, {
    Image: 'wa-scrm-server:test', Cmd: ['node', 'work/wa-replica/serve.cjs', '8080'], User: config.runAs,
    Env: ['WA_SCRM_DATA_DIR=/data', 'WA_SCRM_SITE_ID=t1', 'WA_SCRM_OPENWA_ENV=/data/openwa-t1.env', 'WA_SCRM_LISTEN=0.0.0.0', 'WA_SCRM_AI_ENV=/run/wa-scrm/ai.env'],
    Labels: { 'wa-scrm.site': 't1', 'wa-scrm.part': 'server' },
    HostConfig: {
      NetworkMode: 'wa-scrm', RestartPolicy: { Name: 'unless-stopped' }, Memory: 256 * 1048576, PidsLimit: 256, ReadonlyRootfs: true, Init: true,
      CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'], Tmpfs: { '/tmp': '' },
      Mounts: [{ Type: 'bind', Source: '/srv/wa-scrm/data', Target: '/data' }, { Type: 'bind', Source: '/srv/wa-scrm/ai.env', Target: '/run/wa-scrm/ai.env', ReadOnly: true }], LogConfig: { Type: 'json-file', Config: { 'max-size': '10m', 'max-file': '3' } },
    },
  }, 'what the caller sent beside the id — an image, a command, a limit — is nowhere');
  assert.deepEqual([volumes.has('wa-scrm-openwa-t1'), keys.length, keys[0].name, keys[0].role], [true, 1, 'wa-scrm-t1', 'operator']);
  // the settings file: where the OpenWA is, the restricted key, where and with what secret it delivers; private
  const settings = settingsOf('t1'), lines = Object.fromEntries(settings.trim().split('\n').map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  assert.deepEqual([Object.keys(lines), lines.OPENWA_BASE_URL, lines.OPENWA_API_KEY, lines.OPENWA_HOOK_URL, /^[0-9a-f]{64}$/.test(lines.OPENWA_HOOK_SECRET)], [['OPENWA_BASE_URL', 'OPENWA_API_KEY', 'OPENWA_HOOK_URL', 'OPENWA_HOOK_SECRET'], openwaBase, keys[0].apiKey, 'http://wa-scrm-site-t1:8080/api/wa/hook', true]);
  assert.deepEqual([fs.statSync(path.join(dataDir, 'openwa-t1.env')).mode & 0o777, settings.includes(masterKey)], [0o600, false], 'private, and the key OpenWA was started with is not in it');
  assert.deepEqual((await call('/sites')).json.room, { max: 2, running: 1, freeMb: 4000, minFreeMb: 1400, canStart: true });
  assert.deepEqual((await call('/sites', { method: 'POST', body: { id: 't1' } })).json, { error: 'exists' });
});

test('no room: a sub-site too many, or too little memory left on the host — and then nothing is made; two requests at once cannot both take the last place', async () => {
  const from = calls.length;
  const [first, second] = await Promise.all([call('/sites', { method: 'POST', body: { id: 't2' } }), call('/sites', { method: 'POST', body: { id: 't3' } })]);
  assert.deepEqual([first.status, second.status].sort(), [202, 409], 'one place was left');
  const taken = first.status === 202 ? 't2' : 't3', refused = taken === 't2' ? 't3' : 't2';
  assert.deepEqual([(first.status === 409 ? first : second).json, (await settled(taken)).state], [{ error: 'full' }, 'ready']);
  assert.deepEqual([(await call('/sites', { method: 'POST', body: { id: refused } })).json, (await stateOf(refused)), (await call('/sites')).json.room.canStart], [{ error: 'full' }, undefined, false]);
  assert.equal(changes(from).filter(line => line.includes(refused)).length, 0, 'nothing was made for the one that was refused');
  // a place becomes free when a sub-site is stopped; too little memory is the other reason
  assert.equal((await call(`/sites/${taken}/stop`, { method: 'POST' })).status, 200);
  free = 1399;
  const low = calls.length;
  assert.deepEqual([(await call('/sites', { method: 'POST', body: { id: refused } })).json, (await call(`/sites/${taken}/start`, { method: 'POST' })).json, (await call('/sites')).json.room], [{ error: 'low-memory' }, { error: 'low-memory' }, { max: 2, running: 1, freeMb: 1399, minFreeMb: 1400, canStart: false }]);
  assert.deepEqual(changes(low), []);
  free = 4000;
});

test('stop and start: the server is stopped first, then OpenWA; started again it has what it had, and a sub-site that runs is simply left running', async () => {
  const before = settingsOf('t1'), from = calls.length, asked = keys.length;
  assert.deepEqual((await call('/sites/t1/stop', { method: 'POST' })).json, { id: 't1', state: 'stopped' });
  assert.deepEqual(changes(from), ['POST /containers/wa-scrm-site-t1/stop', 'POST /containers/wa-scrm-openwa-t1/stop']);
  assert.deepEqual([await stateOf('t1'), (await call('/sites/t1/stop', { method: 'POST' })).status], [{ id: 't1', state: 'stopped' }, 200]);
  const again = calls.length;
  assert.equal((await call('/sites/t1/start', { method: 'POST' })).status, 202);
  assert.deepEqual([await settled('t1'), changes(again), keys.length, settingsOf('t1') === before], [{ id: 't1', state: 'ready' }, ['POST /containers/wa-scrm-openwa-t1/start', 'POST /containers/wa-scrm-site-t1/start'], asked, true], 'no container, no key and no settings file is made anew');
  assert.equal((await call('/sites/t1/start', { method: 'POST' })).status, 202, 'starting what runs is no mistake');
  assert.deepEqual(await settled('t1'), { id: 't1', state: 'ready' });
});

test('a sub-site that was moved here — its OpenWA\'s data and its settings file exist — is started as it is; one whose making stopped half-way is finished; what cannot be put together says why', async () => {
  for (const id of ['t2', 't3']) if (containers.has('wa-scrm-openwa-' + id)) await call(`/sites/${id}/stop`, { method: 'POST' });
  // moved here: the volume and the settings file, no container
  volumes.add('wa-scrm-openwa-m1');
  fs.writeFileSync(path.join(dataDir, 'openwa-m1.env'), 'OPENWA_BASE_URL=http://wa-scrm-openwa-m1:2785\nOPENWA_API_KEY=kept\nOPENWA_HOOK_URL=http://wa-scrm-site-m1:8080/api/wa/hook\nOPENWA_HOOK_SECRET=kept\n', { mode: 0o600 });
  const asked = keys.length;
  assert.deepEqual((await call('/sites', { method: 'POST', body: { id: 'm1' } })).json, { error: 'exists' }, 'it is not a new one');
  assert.equal((await call('/sites/m1/start', { method: 'POST' })).status, 202);
  assert.deepEqual([await settled('m1'), containers.get('wa-scrm-openwa-m1').spec.Env.some(line => line.startsWith('API_MASTER_KEY=')), keys.length, settingsOf('m1').includes('OPENWA_API_KEY=kept')], [{ id: 'm1', state: 'ready' }, false, asked, true], 'no key of the platform\'s choice, no new restricted key, the settings as they came');
  await call('/sites/m1/stop', { method: 'POST' });
  // half-way: the OpenWA was made and started, then the provisioner went away before the settings were written
  mood = 'never';
  assert.equal((await call('/sites', { method: 'POST', body: { id: 'h1' } })).status, 202);
  assert.deepEqual(await settled('h1'), { id: 'h1', state: 'failed', reason: 'openwa-not-healthy' });
  assert.equal(fs.existsSync(path.join(dataDir, 'openwa-h1.env')), false);
  mood = 'ok';
  assert.equal((await call('/sites/h1/start', { method: 'POST' })).status, 202);
  assert.deepEqual([await settled('h1'), keys.at(-1).name, settingsOf('h1').includes(keys.at(-1).apiKey)], [{ id: 'h1', state: 'ready' }, 'wa-scrm-h1', true], 'finished with the key its OpenWA was started with');
  await call('/sites/h1/stop', { method: 'POST' });
  // the settings file without the data, and the data without the settings file
  fs.writeFileSync(path.join(dataDir, 'openwa-o1.env'), 'OPENWA_BASE_URL=x\n', { mode: 0o600 });
  assert.equal((await call('/sites/o1/start', { method: 'POST' })).status, 202);
  assert.deepEqual(await settled('o1'), { id: 'o1', state: 'failed', reason: 'data-missing' });
  fs.rmSync(path.join(dataDir, 'openwa-m1.env'));
  assert.equal((await call('/sites/m1/start', { method: 'POST' })).status, 202);
  assert.deepEqual(await settled('m1'), { id: 'm1', state: 'failed', reason: 'settings-missing' });
  assert.deepEqual((await stateOf('t1')), { id: 't1', state: 'ready' }, 'the others are as they were');
});

test('an OpenWA that stops again, or an image that is not there: the sub-site is failed with the reason and takes no place', async () => {
  mood = 'dies';
  assert.equal((await call('/sites', { method: 'POST', body: { id: 'd1' } })).status, 202);
  assert.deepEqual(await settled('d1'), { id: 'd1', state: 'failed', reason: 'openwa-stopped' });
  mood = 'ok';
  const other = create({ config: { ...config, openwaImage: 'no-such-image' }, docker: engine(socket), freeMb: () => free, openwaUrl: () => openwaBase, wait: () => new Promise(resolve => setImmediate(resolve)), healthWaitMs: 150 });
  const server = http.createServer(other.handle);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const at = `http://127.0.0.1:${server.address().port}`, headers = { Authorization: 'Bearer ' + SECRET, 'Content-Type': 'application/json' };
    assert.equal((await fetch(at + '/sites', { method: 'POST', headers, body: JSON.stringify({ id: 'i1' }) })).status, 202);
    let site;
    for (let i = 0; i < 200 && (!site || site.state === 'starting'); i++) { await new Promise(resolve => setTimeout(resolve, 5)); site = (await (await fetch(at + '/sites', { headers })).json()).sites.find(s => s.id === 'i1'); }
    assert.deepEqual(site, { id: 'i1', state: 'failed', reason: 'engine' });
  } finally {
    server.closeAllConnections(); server.close();
  }
  assert.deepEqual((await call('/sites')).json.room.running, 1, 'only the one that runs takes a place');
});

test('the settings from the environment: what is needed is asked for, the secret is long enough, the rest has its defaults', () => {
  const secretFile = path.join(tmp, 'secret');
  fs.writeFileSync(secretFile, SECRET + '\n');
  const env = { WA_SCRM_PROVISIONER_SECRET_FILE: secretFile, WA_SCRM_SERVER_IMAGE: 'server:1', WA_SCRM_OPENWA_IMAGE: 'openwa:1', WA_SCRM_HOST_DATA_DIR: '/host/data', WA_SCRM_DATA_DIR: '/data' };
  assert.deepEqual(configFromEnv(env), { secret: SECRET, runAs: '1000:1000', serverImage: 'server:1', openwaImage: 'openwa:1', hostDataDir: '/host/data', dataDir: '/data', hostAiEnv: '', network: 'wa-scrm', maxSites: 4, minFreeMb: 1400, openwaMemoryMb: 1536, serverMemoryMb: 256 });
  assert.deepEqual(configFromEnv({ ...env, WA_SCRM_MAX_SITES: '3', WA_SCRM_MIN_FREE_MB: '900', WA_SCRM_RUN_AS: '1001:1002', WA_SCRM_NETWORK: 'other', WA_SCRM_HOST_AI_ENV: '/host/ai.env' }).maxSites, 3);
  for (const name of Object.keys(env)) assert.throws(() => configFromEnv({ ...env, [name]: '' }), new RegExp(name), name);
  fs.writeFileSync(secretFile, 'too short');
  assert.throws(() => configFromEnv(env), /at least 32/);
  fs.writeFileSync(secretFile, SECRET);
  assert.throws(() => configFromEnv({ ...env, WA_SCRM_RUN_AS: 'root' }), /WA_SCRM_RUN_AS/);
});

test('the lines name the action, the sub-site and the outcome — never a key or a secret', () => {
  const lines = logged.filter(line => line.startsWith('provisioner '));
  for (const line of ['provisioner create ok site=t1', 'provisioner stop ok site=t1', 'provisioner start ok site=t1', 'provisioner create failed site=h1 error=openwa-not-healthy', 'provisioner start failed site=m1 error=settings-missing', 'provisioner create failed site=d1 error=openwa-stopped']) assert(lines.includes(line), line + '\n' + lines.join('\n'));
  assert(lines.some(line => line.startsWith('provisioner create failed site=i1 error=engine detail=404 No such image')), lines.join('\n'));
  const all = logged.join('\n'), secrets = [SECRET, ...keys.map(key => key.apiKey), ...[...containers.values()].flatMap(c => c.spec.Env).filter(line => line.startsWith('API_MASTER_KEY=')).map(line => line.slice(15))];
  assert(secrets.length > 4);
  for (const secret of secrets) assert(!all.includes(secret), 'a secret in the log');
});
