export function StatusBadge({ status }) {
  const statusConfig = {
    online: { emoji: '🟢', label: 'Online', className: 'status-online' },
    offline: { emoji: '🔴', label: 'Offline', className: 'status-offline' },
    unknown: { emoji: '⚪', label: 'Unknown', className: 'status-unknown' },
    checking: { emoji: '🟡', label: 'Checking', className: 'status-checking' },
  };

  const config = statusConfig[status] || statusConfig.unknown;

  return (
    <span className={`status-badge ${config.className}`}>
      {config.emoji} {config.label}
    </span>
  );
}
