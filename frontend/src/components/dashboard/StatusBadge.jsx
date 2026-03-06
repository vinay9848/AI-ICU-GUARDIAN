const STATUS_CONFIG = {
  stable: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-400', dot: 'bg-green-500', label: 'Stable' },
  monitoring: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-400', dot: 'bg-yellow-500', label: 'Monitoring' },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-400', dot: 'bg-red-500', label: 'Critical' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.stable;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${status === 'critical' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
}
