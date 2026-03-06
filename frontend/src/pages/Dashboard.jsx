import { useState } from 'react';
import { usePatients } from '../hooks/usePatients';
import { useAlertSound } from '../hooks/useAlertSound';
import PatientTable from '../components/dashboard/PatientTable';

const FILTERS = ['all', 'stable', 'monitoring', 'critical'];

export default function Dashboard() {
  const { patients, loading, error } = usePatients(5000);
  const [filter, setFilter] = useState('all');

  // Alert sound + browser notification when a patient becomes critical
  useAlertSound(patients);

  const filtered = filter === 'all' ? patients : patients.filter(p => p.status === filter);

  const counts = {
    all: patients.length,
    stable: patients.filter(p => p.status === 'stable').length,
    monitoring: patients.filter(p => p.status === 'monitoring').length,
    critical: patients.filter(p => p.status === 'critical').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-medical-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-dark-muted">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-700 dark:text-red-400 font-medium">Failed to load patients</p>
        <p className="text-red-500 dark:text-red-300 text-sm mt-1">{error}</p>
        <p className="text-gray-500 dark:text-dark-muted text-sm mt-2">Make sure the backend is running on port 8000</p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Patients" value={counts.all} color="bg-medical-blue" />
        <StatCard label="Stable" value={counts.stable} color="bg-status-stable" />
        <StatCard label="Monitoring" value={counts.monitoring} color="bg-status-monitor" />
        <StatCard label="Critical" value={counts.critical} color="bg-status-critical" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              filter === f
                ? 'bg-medical-blue text-white shadow-sm'
                : 'bg-white dark:bg-dark-card text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-dark-border'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      <PatientTable patients={filtered} />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border p-4 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center`}>
          <span className="text-white font-bold text-lg">{value}</span>
        </div>
        <span className="text-sm text-gray-600 dark:text-dark-muted font-medium">{label}</span>
      </div>
    </div>
  );
}
