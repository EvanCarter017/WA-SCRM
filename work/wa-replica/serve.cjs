const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const aiRelay = require('./ai-relay.cjs');

const workspace = path.resolve(__dirname, '../..');
const root = path.join(workspace, 'outputs/wa-replica-prototype');
const port = Number(process.argv[2] || 56141);
// With WA_SCRM_DATA_DIR set, the server keeps the accounts and the data of one sub-site (site-api.cjs; needs
// Node 22.13 or newer), the AI relay answers signed-in users only, and the sub-site can be linked to its own
// OpenWA (openwa-link.cjs; settings file named by WA_SCRM_OPENWA_ENV). Without it, the server serves the page
// and the relay as before.
const site = process.env.WA_SCRM_DATA_DIR
  ? require('./site-api.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: process.env.WA_SCRM_SITE_ID || 'default' })
  : null;
const waLink = site ? require('./openwa-link.cjs').create({ dir: process.env.WA_SCRM_DATA_DIR, siteId: site.siteId, site }) : null;
// A sub-site's server also answers under the sub-site's name, for its data and its WhatsApp link:
// /site/<id>/api/data and /site/<id>/api/wa/… are /api/data and /api/wa/… of the sub-site <id>. The supervisor
// page reads several sub-sites side by side this way, and a gateway in front of several servers passes such a
// request to the right one by its path. Everything else — signing in above all — has the plain address only, so
// that wrong attempts to sign in are counted by one server.
const named = site ? '/site/' + site.siteId : null;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function serveFile(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end('Method not allowed');
  }
  if (pathname === '/favicon.ico') {
    res.writeHead(204);
    return res.end();
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  const body = await fs.readFile(file);
  res.writeHead(200, {
    'Content-Type': mime[path.extname(file)] || 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(req.method === 'HEAD' ? undefined : body);
}

const isSiteRoute = pathname => pathname.startsWith('/api/site/') || pathname.startsWith('/api/auth/') || pathname === '/api/data';

const server = http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (named && (pathname === named + '/api/data' || pathname.startsWith(named + '/api/wa/'))) pathname = pathname.slice(named.length);
    if (isSiteRoute(pathname)) {
      if (site) await site.handle(req, res, pathname);
      else if (pathname === '/api/site/status') sendJson(res, 200, { enabled: false });
      else sendJson(res, 503, { error: 'not-enabled' });
    } else if (pathname.startsWith('/api/ai/')) {
      if (site && !site.allows(req)) {
        req.resume();
        sendJson(res, 401, { error: 'not-signed-in' });
      } else await aiRelay.handle(req, res, pathname);
    } else if (pathname.startsWith('/api/wa/')) {
      if (waLink) await waLink.handle(req, res, pathname);
      else if (pathname === '/api/wa/status') sendJson(res, 200, { configured: false, reason: 'not-enabled' });
      else sendJson(res, 503, { error: 'not-enabled' });
    } else await serveFile(req, res, pathname);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('PREVIEW_URL=http://127.0.0.1:' + server.address().port);
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
