import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

import { createApiRouter } from './server/backend.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;
const distDir = path.resolve(rootDir, 'dist');
const env = loadEnv('production', rootDir, '');

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
  }[ext] || 'application/octet-stream';
}

async function serveStatic(req, res) {
  const url = new URL(req.url, 'http://127.0.0.1');
  const requestedPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const safePath = path.normalize(requestedPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  let filePath = path.join(distDir, safePath);
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(distDir, 'index.html');
  }
  try {
    const file = await fs.readFile(filePath);
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType(filePath));
    res.end(file);
  } catch {
    res.statusCode = 404;
    res.end('Not found');
  }
}

const apiRouter = createApiRouter({
  rootDir,
  aiProvider: env.AI_PROVIDER || process.env.AI_PROVIDER || '',
  openaiApiKey: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
  groqApiKey: env.GROQ_API_KEY || process.env.GROQ_API_KEY || '',
});

const server = http.createServer(async (req, res) => {
  const handled = await apiRouter(req, res);
  if (handled) return;
  await serveStatic(req, res);
});

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || '0.0.0.0';

server.listen(port, host, () => {
  console.log(`Discipline OS online server running at http://${host}:${port}`);
});
