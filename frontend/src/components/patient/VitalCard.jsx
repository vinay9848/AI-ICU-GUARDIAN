const VITAL_CONFIG = {
  heart_rate:       { label: 'Heart Rate', unit: 'bpm', min: 60, max: 100, icon: '♥', decimals: 0 },
  bp_systolic:      { label: 'BP Systolic', unit: 'mmHg', min: 90, max: 140, icon: '↑', decimals: 0 },
  bp_diastolic:     { label: 'BP Diastolic', unit: 'mmHg', min: 60, max: 90, icon: '↓', decimals: 0 },
  spo2:             { label: 'Oxygen Saturation', unit: '%', min: 95, max: 100, icon: 'O₂', decimals: 1 },
  temperature:      { label: 'Temperature', unit: '°C', min: 36.1, max: 37.2, icon: '🌡', decimals: 1 },
  glucose:          { label: 'Blood Glucose', unit: 'mg/dL', min: 70, max: 140, icon: '◉', decimals: 0 },
  respiration_rate: { label: 'Respiration Rate', unit: '/min', min: 12, max: 20, icon: '≋', decimals: 0 },
};

export default function VitalCard({ vitalKey, value }) {
  const config = VITAL_CONFIG[vitalKey];
  if (!config) return null;

  const displayVal = value != null ? value.toFixed(config.decimals) : '—';
  const isLow = value != null && value < config.min;
  const isHigh = value != null && value > config.max;

  let borderColor = 'border-green-300 dark:border-green-700';
  let bgColor = 'bg-green-50 dark:bg-green-900/20';
  let statusText = 'Normal';
  let statusColor = 'text-green-700 dark:text-green-400';

  if (isHigh || isLow) {
    const range = config.max - config.min;
    const deviation = isHigh ? (value - config.max) / range : (config.min - value) / range;
    if (deviation > 0.5) {
      borderColor = 'border-red-400 dark:border-red-700';
      bgColor = 'bg-red-50 dark:bg-red-900/20';
      statusText = isHigh ? 'Critical High' : 'Critical Low';
      statusColor = 'text-red-700 dark:text-red-400';
    } else {
      borderColor = 'border-yellow-400 dark:border-yellow-700';
      bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
      statusText = isHigh ? 'Above Normal' : 'Below Normal';
      statusColor = 'text-yellow-700 dark:text-yellow-400';
    }
  }

  if (value == null) {
    borderColor = 'border-gray-200 dark:border-dark-border';
    bgColor = 'bg-gray-50 dark:bg-dark-card';
    statusText = 'No Data';
    statusColor = 'text-gray-500 dark:text-dark-muted';
  }

  return (
    <div className={`rounded-xl border-2 ${borderColor} ${bgColor} p-4 transition-all`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{config.icon}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor} bg-white/60 dark:bg-white/10`}>
          {statusText}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-dark-muted font-medium mb-1">{config.label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">
        {displayVal}
        <span className="text-sm font-normal text-gray-500 dark:text-dark-muted ml-1">{config.unit}</span>
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Normal: {config.min}–{config.max} {config.unit}
      </p>
    </div>
  );
}

export { VITAL_CONFIG };
