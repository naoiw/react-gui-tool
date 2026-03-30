const { createReadStream, existsSync, statSync } = require('node:fs');
const { extname, join, normalize, dirname } = require('node:path');
const { createServer } = require('node:http');

const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';
const baseDir = process.pkg ? dirname(process.execPath) : process.cwd();
const distDir = normalize(join(baseDir, 'dist'));

if (!existsSync(distDir)) {
  console.error(`dist directory not found: ${distDir}`);
  console.error('Place this executable next to a dist folder.');
  process.exit(1);
}

const mimeMap = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.ico', 'image/x-icon'],
]);

function resolveSafePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const relativePath = cleanPath === '/' ? '/index.html' : cleanPath;
  const filePath = normalize(join(distDir, relativePath));

  if (!filePath.startsWith(distDir)) {
    return null;
  }

  return filePath;
}

function sendFile(res, filePath) {
  const ext = extname(filePath).toLowerCase();
  const contentType = mimeMap.get(ext) ?? 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

const server = createServer((req, res) => {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const rawUrl = req.url ?? '/';
  const resolvedPath = resolveSafePath(rawUrl);
  if (!resolvedPath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  let filePath = resolvedPath;
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(distDir, 'index.html');
  }

  if (method === 'HEAD') {
    const ext = extname(filePath).toLowerCase();
    const contentType = mimeMap.get(ext) ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end();
    return;
  }

  sendFile(res, filePath);
});

server.listen(port, host, () => {
  console.log(`Serving dist at http://${host}:${port}`);
  console.log(`dist path: ${distDir}`);
  console.log('Open this URL in Chrome/Edge/Brave.');
});
