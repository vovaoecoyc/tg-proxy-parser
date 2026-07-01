import { useState, useEffect } from 'react';

const API_BASE = '/api';

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const result = await fn(items[currentIndex], currentIndex);
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export function useProxies() {
  const [proxies, setProxies] = useState([]);
  const [newProxies, setNewProxies] = useState([]);
  const [filter, setFilter] = useState('all');
  const [checkingIds, setCheckingIds] = useState(new Set());
  const [autoCheckProgress, setAutoCheckProgress] = useState(null);

  const fetchAllProxies = async () => {
    try {
      const response = await fetch(`${API_BASE}/proxies`);
      const data = await response.json();
      setProxies(data);
    } catch (error) {
      console.error('Failed to fetch proxies:', error);
    }
  };

  const fetchNewProxies = async () => {
    try {
      const response = await fetch(`${API_BASE}/proxies/new`);
      const data = await response.json();
      setNewProxies(data);
    } catch (error) {
      console.error('Failed to fetch new proxies:', error);
    }
  };

  const checkProxy = async (id) => {
    setCheckingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE}/proxy/${id}/check`, {
        method: 'POST',
      });
      const updatedProxy = await response.json();
      
      setProxies(prev => prev.map(p => p.id === id ? updatedProxy : p));
      setNewProxies(prev => prev.map(p => p.id === id ? updatedProxy : p));
    } catch (error) {
      console.error('Failed to check proxy:', error);
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const checkAllProxies = async () => {
    const ids = currentProxies.map(p => p.id);
    setCheckingIds(new Set(ids));
    setProxies(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'checking' } : p));
    setNewProxies(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'checking' } : p));
    try {
      const response = await fetch(`${API_BASE}/proxies/check-all`, {
        method: 'POST',
      });
      const results = await response.json();
      setProxies(results);
      setNewProxies(prev => {
        const resultMap = new Map(results.map(r => [r.id, r]));
        return prev.map(p => resultMap.get(p.id) || p);
      });
    } catch (error) {
      console.error('Failed to check all proxies:', error);
    } finally {
      setCheckingIds(new Set());
    }
  };

  const autoCheckAll = async (proxiesToCheck) => {
    if (proxiesToCheck.length === 0) return;

    const BATCH_SIZE = 20;
    const CONCURRENCY = 5;
    const ids = proxiesToCheck.map(p => p.id);
    const batches = chunk(ids, BATCH_SIZE);

    setCheckingIds(new Set(ids));
    setAutoCheckProgress({ checked: 0, total: ids.length });

    let checked = 0;

    await runWithConcurrency(batches, CONCURRENCY, async (batchIds) => {
      try {
        const response = await fetch(`${API_BASE}/proxies/check-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batchIds }),
        });
        const results = await response.json();

        setProxies(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          for (const r of results) map.set(r.id, r);
          return Array.from(map.values());
        });
        setNewProxies(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          for (const r of results) map.set(r.id, r);
          return Array.from(map.values());
        });

        checked += results.length;
        setAutoCheckProgress(prev => ({ ...prev, checked }));
      } catch (error) {
        console.error('Batch check failed:', error);
        checked += batchIds.length;
        setAutoCheckProgress(prev => ({ ...prev, checked }));
      }
    });

    setCheckingIds(new Set());
    setAutoCheckProgress(null);
  };

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const response = await fetch(`${API_BASE}/proxies`);
        const data = await response.json();
        if (cancelled) return;
        setProxies(data);

        await autoCheckAll(data);
      } catch (error) {
        console.error('Failed to fetch proxies:', error);
      }
    };

    init();

    fetchNewProxies();

    return () => { cancelled = true; };
  }, []);

  const currentProxies = filter === 'all' ? proxies : newProxies;

  return {
    proxies: currentProxies,
    filter,
    setFilter,
    checkingIds,
    checkProxy,
    checkAllProxies,
    autoCheckProgress,
    refresh: () => {
      fetchAllProxies();
      fetchNewProxies();
    },
  };
}
