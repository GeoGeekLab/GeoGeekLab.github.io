import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT || 4173);

if (!fs.existsSync(dist)) {
  console.error('dist/ is missing. Run npm run build before the browser quality suite.');
  process.exit(1);
}

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function resolveTarget(pathname) {
  let decoded = '/';
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return { status: 400, file: null };
  }

  if (decoded.endsWith('/')) decoded += 'index.html';
  const requested = path.resolve(dist, `.${decoded}`);
  if (!requested.startsWith(dist + path.sep) && requested !== path.join(dist, 'index.html')) {
    return { status: 403, file: null };
  }

  if (fs.existsSync(requested) && fs.statSync(requested).isFile()) {
    return { status: 200, file: requested };
  }

  const notFound = path.join(dist, '404.html');
  return { status: 404, file: fs.existsSync(notFound) ? notFound : null };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const { status, file } = resolveTarget(url.pathname);

  if (!file) {
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(status === 400 ? 'Bad request' : status === 403 ? 'Forbidden' : 'Not found');
    return;
  }

  res.statusCode = status;
  res.setHeader('Content-Type', mime[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`GeoGeek quality server: http://127.0.0.1:${port}/`);
});
