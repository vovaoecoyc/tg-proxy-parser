import { Hono } from 'hono';
import { loadAllProxies, loadNewProxies } from '../services/proxyLoader.js';
import { checkProxy } from '../services/proxyChecker.js';

const proxiesRouter = new Hono();

let proxiesCache = [];

const STATUS_PRIORITY = {
  online: 0,
  offline: 1,
  unknown: 2,
  checking: 3,
};

function sortProxies(list, sortField, sortOrder) {
  if (!sortField) return list;

  const direction = sortOrder === 'desc' ? -1 : 1;
  const sorted = [...list];

  if (sortField === 'status') {
    sorted.sort((a, b) => {
      const pa = STATUS_PRIORITY[a.status] ?? 99;
      const pb = STATUS_PRIORITY[b.status] ?? 99;
      return (pa - pb) * direction;
    });
  } else {
    sorted.sort((a, b) => {
      const va = a[sortField] ?? '';
      const vb = b[sortField] ?? '';
      if (va < vb) return -1 * direction;
      if (va > vb) return 1 * direction;
      return 0;
    });
  }

  return sorted;
}

proxiesRouter.get('/proxies', async (c) => {
  if (proxiesCache.length === 0) {
    proxiesCache = loadAllProxies();
  }

  const sortField = c.req.query('sortField');
  const sortOrder = c.req.query('sortOrder');

  return c.json(sortProxies(proxiesCache, sortField, sortOrder));
});

proxiesRouter.get('/proxies/new', async (c) => {
  const newProxies = await loadNewProxies();

  const merged = newProxies.map(np => {
    const cached = proxiesCache.find(p => p.id === np.id);
    return cached || np;
  });

  const sortField = c.req.query('sortField');
  const sortOrder = c.req.query('sortOrder');

  return c.json(sortProxies(merged, sortField, sortOrder));
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
  try {
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
  } catch (error) {
    console.error('check-batch failed:', error.message);
    return c.json({ error: 'check-batch failed', details: error.message }, 500);
  }
});

export default proxiesRouter;
