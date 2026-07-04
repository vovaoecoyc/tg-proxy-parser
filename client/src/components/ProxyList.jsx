import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ProxyItem } from './ProxyItem';

export function ProxyList({ proxies, onCheck, onCopy, checkingIds, sortField, sortOrder, onSortStatus }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: proxies.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 49,
    overscan: 10,
  });

  if (proxies.length === 0) {
    return <p className="empty-message">No proxies found</p>;
  }

  const statusIndicator = sortField === 'status'
    ? (sortOrder === 'asc' ? '▲' : '▼')
    : '↕';

  return (
    <div className="proxy-table-wrapper">
      <div className="proxy-table-header">
        <div className="proxy-th">Server</div>
        <div className="proxy-th">Port</div>
        <div
          className="proxy-th proxy-th-sortable"
          onClick={onSortStatus}
          role="button"
        >
          Status
          <span className={`proxy-th-sort-indicator${sortField === 'status' ? ' active' : ''}`}>
            {statusIndicator}
          </span>
        </div>
        <div className="proxy-th">Actions</div>
      </div>
      <div ref={parentRef} className="proxy-table-scroll">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const proxy = proxies[virtualRow.index];
            return (
              <div
                key={proxy.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <ProxyItem
                  proxy={proxy}
                  onCheck={onCheck}
                  onCopy={onCopy}
                  isChecking={checkingIds.has(proxy.id)}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="proxy-count">
        Servers: {proxies.length}
      </div>
    </div>
  );
}
