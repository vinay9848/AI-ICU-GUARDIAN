export default function AlertBanner({ patient, risk }) {
  const alerts = [];

  if (patient?.status === 'critical') {
    alerts.push({ type: 'critical', msg: `CRITICAL ALERT — Patient ICU-${patient.patient_id} requires immediate attention` });
  }

  if (risk?.detected_patterns) {
    for (const p of risk.detected_patterns) {
      const lower = p.toLowerCase();
      if (lower.includes('critical') || lower.includes('persistent') || lower.includes('sustained')) {
        alerts.push({ type: 'warning', msg: p });
      }
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
            a.type === 'critical'
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700'
          }`}
        >
          <span className="text-lg">{a.type === 'critical' ? '🚨' : '⚠️'}</span>
          <span className="font-medium text-sm">{a.msg}</span>
        </div>
      ))}
    </div>
  );
}
