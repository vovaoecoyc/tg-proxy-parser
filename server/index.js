import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from '@hono/node-server/serve-static';
import proxiesRouter from './routes/proxies.js';
import { initRepo } from './services/gitService.js';

const app = new Hono();

app.use('/*', cors());

app.route('/api', proxiesRouter);

app.use('/*', serveStatic({ root: './client/dist' }));

app.get('*', serveStatic({ path: './client/dist/index.html' }));

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await initRepo();
    console.log('Repository initialized.');
  } catch (error) {
    console.error('Failed to initialize repository:', error.message);
  }
  
  console.log(`Server running on http://localhost:${port}`);
  
  serve({
    fetch: app.fetch,
    port,
  });
}

startServer();
