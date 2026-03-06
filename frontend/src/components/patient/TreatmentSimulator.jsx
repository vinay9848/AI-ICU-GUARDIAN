import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { getTreatments, simulateTreatment } from '../../api/client';

const VITAL_LABELS = {
  heart_rate: 'Heart Rate',
  bp_systolic: 'BP Systolic',
  bp_diastolic: 'BP Diastolic',
  spo2: 'SpO2',
  temperature: 'Temperature',
  glucose: 'Glucose',
  respiration_rate: 'Resp Rate',
};

export default function TreatmentSimulator({ patientId }) {
  const [treatments, setTreatments] = useState([]);
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTreatments(patientId).then(res => {
      setTreatments(res.data.treatments);
    }).catch(() => {});
  }, [patientId]);

  const runSimulation = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await simulateTreatment(patientId, selected, 6);
      setResult(res.data);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const isDark = document.documentElement.classList.contains('dark');

  // Find which vitals actually change in this simulation
  const changedVitals = result ? Object.keys(VITAL_LABELS).filter(key => {
    const current = result.current_vitals[key];
    const projected = result.projected_timeline[result.projected_timeline.length - 1]?.[key];
    return current != null && projected != null && Math.abs(current - projected) > 0.5;
  }) : [];

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm p-5 transition-colors">
      <h3 className="text-lg font-bold text-gray-800 dark:text-dark-text mb-4 flex items-center gap-2">
        <span className="text-xl">💊</span> Treatment Simulation
      </h3>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={selected}
          onChange={e => { setSelected(e.target.value); setResult(null); }}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-dark-border dark:bg-gray-800 dark:text-dark-text rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue"
        >
          <option value="">Select a treatment...</option>
          {treatments.map(t => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={runSimulation}
          disabled={!selected || loading}
          className="px-5 py-2 bg-medical-blue text-white text-sm font-medium rounded-lg hover:bg-medical-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Risk comparison */}
          <div className="grid grid-cols-3 gap-3">
            <RiskBox label="Current Risk" value={result.current_risk} />
            <div className="flex items-center justify-center">
              <span className="text-2xl text-gray-400 dark:text-dark-muted">→</span>
            </div>
            <RiskBox label="Projected Risk" value={result.projected_risk} />
          </div>

          {/* Risk reduction badge */}
          <div className="text-center">
            {result.risk_reduction > 0 ? (
              <span className="inline-block px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full">
                Risk reduced by {Math.round(result.risk_reduction * 100)}%
              </span>
            ) : (
              <span className="inline-block px-4 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-sm font-semibold rounded-full">
                Minimal risk change — consider alternative treatment
              </span>
            )}
          </div>

          {/* Projected vitals chart */}
          {changedVitals.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">Projected Vitals Over 6 Hours</h4>
              <div className="h-56">
                <Line
                  data={{
                    labels: result.projected_timeline.map(t => `${t.hour}h`),
                    datasets: changedVitals.map((key, i) => ({
                      label: VITAL_LABELS[key],
                      data: result.projected_timeline.map(t => t[key]),
                      borderColor: CHART_COLORS[i % CHART_COLORS.length],
                      backgroundColor: 'transparent',
                      tension: 0.3,
                      pointRadius: 3,
                      borderWidth: 2,
                    })),
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          boxWidth: 12,
                          font: { size: 11 },
                          color: isDark ? '#94a3b8' : undefined,
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { color: isDark ? '#94a3b8' : undefined },
                      },
                      y: {
                        grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
                        ticks: { color: isDark ? '#94a3b8' : undefined },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Before/After vitals table */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Vital Sign Changes</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 dark:text-dark-muted">Vital</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 dark:text-dark-muted">Current</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 dark:text-dark-muted">After 6h</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 dark:text-dark-muted">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                  {Object.entries(VITAL_LABELS).map(([key, label]) => {
                    const current = result.current_vitals[key];
                    const projected = result.projected_timeline[result.projected_timeline.length - 1]?.[key];
                    if (current == null || projected == null) return null;
                    const diff = projected - current;
                    return (
                      <tr key={key}>
                        <td className="px-3 py-2 text-gray-700 dark:text-dark-muted">{label}</td>
                        <td className="px-3 py-2 text-right text-gray-700 dark:text-dark-muted">{current.toFixed(1)}</td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-dark-text">{projected.toFixed(1)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${Math.abs(diff) < 0.5 ? 'text-gray-400 dark:text-gray-500' : diff > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskBox({ label, value }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    : pct >= 40 ? 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    : 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  return (
    <div className={`rounded-lg border p-3 text-center ${color}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold">{pct}%</p>
    </div>
  );
}

const CHART_COLORS = ['#E53E3E', '#2B6CB0', '#38A169', '#D69E2E', '#805AD5', '#DD6B20', '#319795'];
