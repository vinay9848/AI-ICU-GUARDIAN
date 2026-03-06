import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);

const CHART_COLORS = {
  heart_rate:       { line: '#E53E3E', fill: 'rgba(229, 62, 62, 0.1)' },
  bp_systolic:      { line: '#D69E2E', fill: 'rgba(214, 158, 46, 0.1)' },
  bp_diastolic:     { line: '#38A169', fill: 'rgba(56, 161, 105, 0.1)' },
  spo2:             { line: '#2B6CB0', fill: 'rgba(43, 108, 176, 0.1)' },
  temperature:      { line: '#DD6B20', fill: 'rgba(221, 107, 32, 0.1)' },
  glucose:          { line: '#805AD5', fill: 'rgba(128, 90, 213, 0.1)' },
  respiration_rate: { line: '#319795', fill: 'rgba(49, 151, 149, 0.1)' },
};

const LABELS = {
  heart_rate: 'Heart Rate (bpm)',
  bp_systolic: 'BP Systolic (mmHg)',
  bp_diastolic: 'BP Diastolic (mmHg)',
  spo2: 'SpO₂ (%)',
  temperature: 'Temperature (°C)',
  glucose: 'Glucose (mg/dL)',
  respiration_rate: 'Respiration Rate (/min)',
};

export default function VitalChart({ vitalKey, readings }) {
  if (!readings || readings.length === 0) return null;

  const isDark = document.documentElement.classList.contains('dark');
  const colors = CHART_COLORS[vitalKey] || { line: '#718096', fill: 'rgba(113, 128, 150, 0.1)' };
  const tickColor = isDark ? '#94a3b8' : undefined;
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

  const labels = readings.map(r => {
    const d = new Date(r.timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const values = readings.map(r => r[vitalKey]);

  const data = {
    labels,
    datasets: [{
      label: LABELS[vitalKey] || vitalKey,
      data: values,
      borderColor: colors.line,
      backgroundColor: colors.fill,
      fill: true,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 2,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? 'rgba(30,41,59,0.95)' : 'rgba(0,0,0,0.8)',
        titleFont: { size: 12 },
        bodyFont: { size: 13 },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 8, font: { size: 10 }, color: tickColor },
      },
      y: {
        grid: { color: gridColor },
        ticks: { font: { size: 10 }, color: tickColor },
      },
    },
    interaction: { intersect: false, mode: 'index' },
  };

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-4 shadow-sm transition-colors">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">{LABELS[vitalKey]}</h3>
      <div className="h-48">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
