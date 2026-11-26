import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createApiApp } from './server/apiApp.ts';

const PORT = Number(process.env.PORT) || 3000;
const DIST_DIR = path.resolve(process.cwd(), 'dist');

async function startServer() {
  const app = createApiApp();

  // Vite dev middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(DIST_DIR));
    app.use((req, res) => {
      const cleanPath = req.path.replace(/^\/+|\/+$/g, '');
      if (cleanPath && !cleanPath.includes('..')) {
        const candidate = path.resolve(DIST_DIR, cleanPath, 'index.html');
        if (candidate.startsWith(DIST_DIR + path.sep) && fs.existsSync(candidate)) {
          return res.sendFile(candidate);
        }
      }
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Learnify server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Learnify server:', err);
  process.exit(1);
});
