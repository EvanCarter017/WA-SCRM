const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const promptFormat = require('./review-prompt-format.js');

const workspace = path.resolve(__dirname, '../..');
const root = path.join(workspace, 'outputs/wa-replica-prototype');
const promptDirectory = path.resolve(process.argv[3] || path.join(workspace, 'outputs/review-prompts'));
const port = Number(process.argv[2] || 56141);
const maxBodySize = 64 * 1024;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

async function readPrompt(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.length;
    if (size > maxBodySize) {
      req.resume();
      throw Object.assign(new Error('备注请求太长。'), { status: 413 });
    }
    chunks.push(chunk);
  }
  try {
    return promptFormat.normalize(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch (error) {
    throw Object.assign(new Error(error instanceof SyntaxError ? '备注内容无法读取。' : error.message), { status: 400 });
  }
}

async function writePrompt(record) {
  const filename = promptFormat.fileName(record);
  const destination = path.join(promptDirectory, filename);
  const markdown = promptFormat.markdown(record);
  await fs.mkdir(promptDirectory, { recursive: true });

  let file;
  try {
    file = await fs.open(destination, 'wx');
  } catch (error) {
    // A retry after a lost response reuses the same filename and content.
    if (error.code === 'EEXIST' && await fs.readFile(destination, 'utf8') === markdown) return filename;
    throw error;
  }
  try {
    await file.writeFile(markdown, 'utf8');
    await file.close();
  } catch (error) {
    await file.close().catch(() => {});
    await fs.unlink(destination).catch(() => {});
    throw error;
  }
  return filename;
}

async function saveReviewPrompt(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: '请从原型的备注框提交。' });
  }
  const actualPort = req.socket.localPort;
  const origins = [`http://127.0.0.1:${actualPort}`, `http://localhost:${actualPort}`];
  if (!origins.includes(req.headers.origin)) {
    return sendJson(res, 403, { error: '请从本地预览提交备注。' });
  }
  const mediaType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return sendJson(res, 415, { error: '备注请求格式无效。' });
  }

  try {
    const record = await readPrompt(req);
    const filename = await writePrompt(record);
    sendJson(res, 201, { filename });
  } catch (error) {
    if (error.status) return sendJson(res, error.status, { error: error.message });
    console.error('Unable to save review prompt:', error.code || error.name);
    sendJson(res, 500, { error: '无法写入本地备注文件夹。' });
  }
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

const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname === '/api/review-prompts') await saveReviewPrompt(req, res);
    else await serveFile(req, res, pathname);
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end('Not found');
  }
});

fs.mkdir(promptDirectory, { recursive: true }).then(() => {
  server.listen(port, '127.0.0.1', () => {
    console.log('PREVIEW_URL=http://127.0.0.1:' + server.address().port);
    console.log('PROMPT_DIR=' + promptDirectory);
  });
}).catch(error => {
  console.error('Unable to create the review prompt folder:', error.message);
  process.exitCode = 1;
});
process.on('SIGINT', () => server.close(() => process.exit(0)));
