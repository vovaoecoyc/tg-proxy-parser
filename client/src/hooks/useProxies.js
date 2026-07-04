import { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE = '/api';

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function runWithConcurrency(items, limit, fn, signal) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      if (signal?.aborted) break;
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
  const [sort, setSort] = useState({ field: null, order: null });

  const controllerRef = useRef(new AbortController());
  const checkIdRef = useRef(0);

  const cancelAllChecks = useCallback(() => {
    controllerRef.current.abort();
    controllerRef.current = new AbortController();
  }, []);

  const buildSortQuery = (sortState) => {
    if (!sortState.field) return '';
    return `?sortField=${encodeURIComponent(sortState.field)}&sortOrder=${encodeURIComponent(sortState.order)}`;
  };

  const fetchAllProxies = async (sortState = sort) => {
    try {
      const response = await fetch(`${API_BASE}/proxies${buildSortQuery(sortState)}`);
      const data = await response.json();
      setProxies(data);
    } catch (error) {
      console.error('Failed to fetch proxies:', error);
    }
  };

  const toggleStatusSort = async () => {
    const nextSort = sort.field === 'status'
      ? { field: 'status', order: sort.order === 'asc' ? 'desc' : 'asc' }
      : { field: 'status', order: 'asc' };
    setSort(nextSort);
    if (filter === 'new') {
      await fetchNewProxies(nextSort);
    } else {
      await fetchAllProxies(nextSort);
    }
  };

  const fetchNewProxies = async (sortState = sort) => {
    try {
      const response = await fetch(`${API_BASE}/proxies/new${buildSortQuery(sortState)}`);
      const data = await response.json();
      setNewProxies(data);
    } catch (error) {
      console.error('Failed to fetch new proxies:', error);
    }
  };

  const checkProxy = async (id) => {
    const signal = controllerRef.current.signal;
    setCheckingIds(prev => new Set(prev).add(id));
    try {
      const response = await fetch(`${API_BASE}/proxy/${id}/check`, {
        method: 'POST',
        signal,
      });
      const updatedProxy = await response.json();
      
      setProxies(prev => prev.map(p => p.id === id ? updatedProxy : p));
      setNewProxies(prev => prev.map(p => p.id === id ? updatedProxy : p));
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Failed to check proxy:', error);
    } finally {
      setCheckingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const checkCurrentProxies = async () => {
    await autoCheckAll(currentProxies);
  };

  const checkFilteredProxies = async (proxiesToCheck) => {
    cancelAllChecks();
    await autoCheckAll(proxiesToCheck, controllerRef.current.signal);
  };

  const autoCheckAll = async (proxiesToCheck, signal) => {
    if (proxiesToCheck.length === 0) return;

    checkIdRef.current += 1;
    const currentCheckId = checkIdRef.current;

    const BATCH_SIZE = 20;
    const CONCURRENCY = 5;
    const ids = proxiesToCheck.map(p => p.id);
    const batches = chunk(ids, BATCH_SIZE);

    setCheckingIds(new Set(ids));
    setAutoCheckProgress({ checked: 0, total: ids.length });

    let checked = 0;

    await runWithConcurrency(batches, CONCURRENCY, async (batchIds) => {
      if (signal?.aborted) return;
      try {
        const response = await fetch(`${API_BASE}/proxies/check-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batchIds }),
          signal,
        });
        const results = await response.json();

        if (checkIdRef.current !== currentCheckId) return;

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

        const resultIds = new Set(results.map(r => r.id));
        setCheckingIds(prev => {
          const next = new Set(prev);
          for (const id of resultIds) next.delete(id);
          return next;
        });

        checked += results.length;
        setAutoCheckProgress(prev => ({ ...prev, checked }));
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Batch check failed:', error);
        if (checkIdRef.current !== currentCheckId) return;
        const batchIdSet = new Set(batchIds);
        setCheckingIds(prev => {
          const next = new Set(prev);
          for (const id of batchIdSet) next.delete(id);
          return next;
        });
        checked += batchIds.length;
        setAutoCheckProgress(prev => ({ ...prev, checked }));
      }
    }, signal);
    if (checkIdRef.current !== currentCheckId) return;
    setAutoCheckProgress(null);
  };

  useEffect(() => {
    const signal = controllerRef.current.signal;

    const init = async () => {
      try {
        const response = await fetch(`${API_BASE}/proxies`, { signal });
        const data = await response.json();
        if (signal.aborted) return;
        setProxies(data);

        await autoCheckAll(data, signal);
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Failed to fetch proxies:', error);
      }
    };

    init();

    fetchNewProxies();
  }, []);

  const currentProxies = filter === 'all' ? proxies : newProxies;

  return {
    proxies: currentProxies,
    allProxies: proxies,
    newProxiesList: newProxies,
    filter,
    setFilter,
    checkingIds,
    checkProxy,
    checkCurrentProxies,
    checkFilteredProxies,
    autoCheckProgress,
    cancelAllChecks,
    sortField: sort.field,
    sortOrder: sort.order,
    toggleStatusSort,
    refresh: () => {
      fetchAllProxies();
      fetchNewProxies();
    },
  };
}
