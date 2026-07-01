export function FilterToggle({ filter, setFilter }) {
  return (
    <div className="filter-toggle">
      <button
        className={filter === 'all' ? 'active' : ''}
        onClick={() => setFilter('all')}
      >
        All Proxies
      </button>
      <button
        className={filter === 'new' ? 'active' : ''}
        onClick={() => setFilter('new')}
      >
        New Proxies
      </button>
    </div>
  );
}
