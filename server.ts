import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createApiApp } from './src/server/app.ts';
import { ensureDbReady, loadDb } from './src/server/store.ts';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  loadDb();
  void ensureDbReady();

  const app = createApiApp();

  // ---------------- VITE / STATIC SERVING ----------------
  const distDir = path.resolve(process.cwd(), 'dist');
  const isRunningUnderTsx = process.execArgv.some((arg) => arg.includes('tsx'));
  const isProd =
    fs.existsSync(distDir) &&
    (process.env.NODE_ENV === 'production' ||
      (!isRunningUnderTsx && process.env.npm_lifecycle_event !== 'dev'));

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hello Noakhali Society server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
