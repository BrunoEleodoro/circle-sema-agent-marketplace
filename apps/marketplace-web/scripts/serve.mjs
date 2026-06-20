import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.env.PORT ?? 5173);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

function resolvePath(url) {
  const pathname = new URL(url, `http://localhost:${port}`).pathname;
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
  const target = join(root, safePath === '/' ? 'index.html' : safePath);
  return existsSync(target) ? target : join(root, 'index.html');
}

createServer((req, res) => {
  const filePath = resolvePath(req.url ?? '/');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('content-type', contentTypes[extname(filePath)] ?? 'application/octet-stream');
  createReadStream(filePath)
    .on('error', () => {
      res.statusCode = 500;
      res.end('Could not read file.');
    })
    .pipe(res);
}).listen(port, () => {
  console.log(`[marketplace-web] http://localhost:${port}`);
});
