import { useState } from 'react';
import { useProxies } from './hooks/useProxies';
import { FilterToggle } from './components/FilterToggle';
import { ProxyList } from './components/ProxyList';
import './App.css';

function App() {
  const { proxies, filter, setFilter, checkingIds, checkProxy, checkAllProxies } = useProxies();
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = (link) => {
    navigator.clipboard.writeText(link);
    setCopiedId(link);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="app">
      <h1>TG Proxy Parser</h1>
      
      <div className="controls">
        <FilterToggle filter={filter} setFilter={setFilter} />
        <button 
          onClick={checkAllProxies} 
          className="btn-check-all"
          disabled={checkingIds.size > 0}
        >
          {checkingIds.size > 0 ? 'Checking...' : 'Check All'}
        </button>
      </div>

      {copiedId && <div className="toast">Link copied!</div>}

      <ProxyList 
        proxies={proxies} 
        onCheck={checkProxy} 
        onCopy={handleCopy}
        checkingIds={checkingIds}
      />
    </div>
  );
}

export default App;
