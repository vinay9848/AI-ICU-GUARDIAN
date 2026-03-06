import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip } from 'chart.js';

ChartJS.register(ArcElement, Tooltip);

export default function RiskMeter({ score }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? '#E53E3E' : pct >= 40 ? '#D69E2E' : '#38A169';
  const isDark = document.documentElement.classList.contains('dark');

  const data = {
    datasets: [{
      data: [pct, 100 - pct],
      backgroundColor: [color, isDark ? '#334155' : '#E2E8F0'],
      borderWidth: 0,
      circumference: 180,
      rotation: 270,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '75%',
    plugins: { tooltip: { enabled: false } },
  };

  return (
    <div className="relative w-48 h-28 mx-auto">
      <Doughnut data={data} options={options} />
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
        <span className="text-3xl font-bold" style={{ color }}>{pct}%</span>
        <span className="text-xs text-gray-500 dark:text-dark-muted">Risk Score</span>
      </div>
    </div>
  );
}
