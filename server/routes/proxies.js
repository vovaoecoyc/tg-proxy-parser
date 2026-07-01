import { Hono } from 'hono';
import { loadAllProxies, loadNewProxies } from '../services/proxyLoader.js';
import { checkProxy } from '../services/proxyChecker.js';

const proxiesRouter = new Hono();

let proxiesCache = [];

proxiesRouter.get('/proxies', async (c) => {
  if (proxiesCache.length === 0) {
    proxiesCache = loadAllProxies();
  }
  return c.json(proxiesCache);
});

proxiesRouter.get('/proxies/new', async (c) => {
  const newProxies = await loadNewProxies();
  return c.json(newProxies);
});

proxiesRouter.post('/proxy/:id/check', async (c) => {
  const { id } = c.req.param();
  
  if (proxiesCache.length === 0) {
    proxiesCache = loadAllProxies();
  }
  
  const proxy = proxiesCache.find(p => p.id === id);
  if (!proxy) {
    return c.json({ error: 'Proxy not found' }, 404);
  }
  
  const updatedProxy = await checkProxy(proxy);
  
  const index = proxiesCache.findIndex(p => p.id === id);
  if (index !== -1) {
    proxiesCache[index] = updatedProxy;
  }
  
  return c.json(updatedProxy);
});

proxiesRouter.post('/proxies/check-all', async (c) => {
  if (proxiesCache.length === 0) {
    proxiesCache = loadAllProxies();
  }
  
  const checkPromises = proxiesCache.map(proxy => checkProxy(proxy));
  const results = await Promise.all(checkPromises);
  
  proxiesCache = results;
  
  return c.json(results);
});

proxiesRouter.post('/proxies/check-batch', async (c) => {
  const { ids } = await c.req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'ids must be a non-empty array' }, 400);
  }

  if (proxiesCache.length === 0) {
    proxiesCache = loadAllProxies();
  }

  const proxiesToCheck = proxiesCache.filter(p => ids.includes(p.id));
  const results = await Promise.all(proxiesToCheck.map(p => checkProxy(p)));

  for (const result of results) {
    const idx = proxiesCache.findIndex(p => p.id === result.id);
    if (idx !== -1) proxiesCache[idx] = result;
  }

  return c.json(results);
});

export default proxiesRouter;
