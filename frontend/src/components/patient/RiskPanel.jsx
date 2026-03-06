import RiskMeter from './RiskMeter';

export default function RiskPanel({ risk }) {
  if (!risk) return null;

  const levelColors = {
    low: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    moderate: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
    high: 'text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30',
    critical: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
  };

  const levelClass = levelColors[risk.risk_level] || levelColors.low;

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm p-6 space-y-6 transition-colors">
      <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text flex items-center gap-2">
        <span className="text-xl">🤖</span> AI Risk Analysis
      </h2>

      {/* Risk Meter */}
      <div className="text-center">
        <RiskMeter score={risk.risk_score} />
        <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold ${levelClass}`}>
          {risk.risk_level.toUpperCase()}
        </span>
      </div>

      {/* MEWS Score */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-dark-muted mb-2">Clinical Early Warning Score (MEWS)</h3>
        <div className="flex items-center gap-3">
          <span className={`text-3xl font-bold ${
            risk.mews_score >= 5 ? 'text-red-600' : risk.mews_score >= 3 ? 'text-yellow-600' : 'text-green-600'
          }`}>
            {risk.mews_score}
          </span>
          <span className="text-sm text-gray-500 dark:text-dark-muted">
            {risk.mews_score >= 5 ? 'High clinical risk' : risk.mews_score >= 3 ? 'Moderate risk' : 'Low risk'}
          </span>
        </div>
      </div>

      {/* Detected Patterns */}
      {risk.detected_patterns.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Detected Patterns</h3>
          <ul className="space-y-1.5">
            {risk.detected_patterns.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-yellow-500 mt-0.5">⚠</span>
                <span className="text-gray-700 dark:text-dark-muted">{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Possible Risks */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-2">Possible Risks</h3>
        <ul className="space-y-1.5">
          {risk.possible_risks.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="text-red-400 mt-0.5">●</span>
              <span className="text-gray-700 dark:text-dark-muted">{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-medical-blue mb-2">Recommendations</h3>
        <ul className="space-y-1.5">
          {risk.recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-dark-muted">
              <span className="text-medical-blue mt-0.5">→</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Predictive Insights */}
      {risk.predictions && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text mb-3">AI Predictive Insights</h3>
          <div className="space-y-2">
            <PredictionBar label="Hypertension Crisis" value={risk.predictions.hypertension_crisis} />
            <PredictionBar label="Respiratory Distress" value={risk.predictions.respiratory_distress} />
            <PredictionBar label="Cardiac Event" value={risk.predictions.cardiac_event} />
            <PredictionBar label="Sepsis" value={risk.predictions.sepsis} />
          </div>
          <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
            <p className="text-sm text-gray-600 dark:text-dark-muted">
              <strong className="dark:text-dark-text">Forecast: </strong>{risk.predictions.condition_forecast}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function PredictionBar({ label, value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 30 ? 'bg-red-400' : pct >= 15 ? 'bg-yellow-400' : 'bg-green-400';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 dark:text-dark-muted w-40 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-dark-muted w-10 text-right">{pct}%</span>
    </div>
  );
}
