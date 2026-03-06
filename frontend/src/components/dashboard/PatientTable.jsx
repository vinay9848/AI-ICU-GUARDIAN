import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function PatientTable({ patients }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden transition-colors">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-dark-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">Patient ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">Age</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">Gender</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">Care Unit</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">LOS (days)</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">Risk</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">HR</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-dark-muted uppercase tracking-wider">SpO2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
            {patients.map((p) => (
              <tr
                key={p.stay_id}
                onClick={() => navigate(`/patients/${p.patient_id}`)}
                className="hover:bg-soft-blue dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 text-sm font-medium text-medical-blue">ICU-{p.patient_id}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-dark-text">{p.name || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-muted">{p.age}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-muted">{p.gender === 'F' ? 'Female' : 'Male'}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-muted">{p.care_unit}</td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-muted">{p.los_days}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3">
                  <RiskBar value={p.risk_score} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-muted">
                  {p.last_vitals?.heart_rate ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 dark:text-dark-muted">
                  {p.last_vitals?.spo2 ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskBar({ value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'bg-red-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-dark-muted">{pct}%</span>
    </div>
  );
}
