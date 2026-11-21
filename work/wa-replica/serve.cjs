const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const aiRelay = require('./ai-relay.cjs');

const workspace = path.resolve(__dirname, '../..');
const root = path.join(workspace, 'outputs/wa-replica-prototype');
const port = Number(process.argv[2] || 56141);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

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

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.startsWith('/api/ai/')) await aiRelay.handle(req, res, pathname);
    else await serveFile(req, res, pathname);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log('PREVIEW_URL=http://127.0.0.1:' + server.address().port);
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
