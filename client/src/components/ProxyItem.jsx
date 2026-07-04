import { StatusBadge } from './StatusBadge';

export function ProxyItem({ proxy, onCheck, onCopy, isChecking }) {
  return (
    <div className="proxy-item">
      <div className="proxy-td proxy-server" title={proxy.server}>{proxy.server}</div>
      <div className="proxy-td">{proxy.port}</div>
      <div className="proxy-td">
        <StatusBadge status={isChecking ? 'checking' : proxy.status} />
      </div>
      <div className="proxy-td">
        <button onClick={() => onCheck(proxy.id)} className="btn-check" disabled={isChecking}>
          {isChecking ? <span className="spinner" /> : 'Check'}
        </button>
        <button onClick={() => onCopy(proxy.link)} className="btn-copy">
          Copy Link
        </button>
      </div>
    </div>
  );
}
