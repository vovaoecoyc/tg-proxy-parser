import { useState, useEffect } from 'react';

const API_BASE = '/api';

export function useProxies() {
  const [proxies, setProxies] = useState([]);
  const [newProxies, setNewProxies] = useState([]);
  const [filter, setFilter] = useState('all');
  const [checkingIds, setCheckingIds] = useState(new Set());

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

  useEffect(() => {
    fetchAllProxies();
    fetchNewProxies();
  }, []);

  const currentProxies = filter === 'all' ? proxies : newProxies;

  return {
    proxies: currentProxies,
    filter,
    setFilter,
    checkingIds,
    checkProxy,
    checkAllProxies,
    refresh: () => {
      fetchAllProxies();
      fetchNewProxies();
    },
  };
}
