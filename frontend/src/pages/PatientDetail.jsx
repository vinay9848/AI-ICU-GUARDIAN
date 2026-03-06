import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePatients } from '../hooks/usePatients';
import { useVitals } from '../hooks/useVitals';
import { useRisk } from '../hooks/useRisk';
import StatusBadge from '../components/dashboard/StatusBadge';
import VitalCard from '../components/patient/VitalCard';
import VitalChart from '../components/patient/VitalChart';
import RiskPanel from '../components/patient/RiskPanel';
import AlertBanner from '../components/patient/AlertBanner';
import ExportPanel from '../components/patient/ExportPanel';
import TreatmentSimulator from '../components/patient/TreatmentSimulator';

const VITAL_KEYS = ['heart_rate', 'bp_systolic', 'bp_diastolic', 'spo2', 'temperature', 'glucose', 'respiration_rate'];
const TIME_RANGES = [
  { label: '6h', hours: 6 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '48h', hours: 48 },
];

export default function PatientDetail() {
  const { id } = useParams();
  const patientId = parseInt(id, 10);
  const [timeRange, setTimeRange] = useState(48);

  const { patients, loading: pLoading } = usePatients(5000);
  const { vitals, loading: vLoading } = useVitals(patientId, timeRange, 5000);
  const { risk, loading: rLoading } = useRisk(patientId, 5000);

  const patient = patients.find(p => p.patient_id === patientId);

  if (pLoading || vLoading || rLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-medical-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 dark:text-dark-muted">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-dark-muted text-lg">Patient not found</p>
        <Link to="/" className="text-medical-blue hover:underline mt-2 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  const allReadings = vitals?.readings || [];

  // Filter readings by selected time range on the frontend
  const readings = (() => {
    if (allReadings.length === 0) return [];
    const lastTs = allReadings.reduce((max, r) => {
      const t = new Date(r.timestamp).getTime();
      return t > max ? t : max;
    }, 0);
    if (!lastTs) return allReadings;
    const cutoff = lastTs - timeRange * 60 * 60 * 1000;
    const filtered = allReadings.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    // If filtering leaves nothing (timestamps too close), show proportional slice
    if (filtered.length === allReadings.length || filtered.length === 0) {
      const fraction = timeRange / 48;
      const count = Math.max(1, Math.round(allReadings.length * fraction));
      return allReadings.slice(-count);
    }
    return filtered;
  })();

  const lastReading = readings.length > 0 ? readings[readings.length - 1] : null;

  return (
    <div>
      {/* Back link */}
      <Link to="/" className="text-medical-blue hover:underline text-sm mb-4 inline-flex items-center gap-1">
        ← Back to Dashboard
      </Link>

      {/* Alert Banner */}
      <AlertBanner patient={patient} risk={risk} />

      {/* Patient Overview */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm p-4 sm:p-5 mb-6 transition-colors">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-3">
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">Patient ID</p>
            <p className="text-lg font-bold text-medical-blue">ICU-{patient.patient_id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">Name</p>
            <p className="text-lg font-semibold text-gray-800 dark:text-dark-text">{patient.name || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">Age</p>
            <p className="text-lg font-semibold dark:text-dark-text">{patient.age}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">Gender</p>
            <p className="text-lg font-semibold dark:text-dark-text">{patient.gender === 'F' ? 'Female' : 'Male'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">Care Unit</p>
            <p className="text-lg font-semibold dark:text-dark-text">{patient.care_unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">Length of Stay</p>
            <p className="text-lg font-semibold dark:text-dark-text">{patient.los_days} days</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">Status</p>
            <StatusBadge status={patient.status} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">AI Risk Score</p>
            <p className={`text-lg font-bold ${
              (risk?.risk_score || 0) >= 0.7 ? 'text-red-600' :
              (risk?.risk_score || 0) >= 0.4 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {risk ? `${Math.round(risk.risk_score * 100)}%` : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-dark-muted">Admission</p>
            <p className="text-sm font-medium text-gray-700 dark:text-dark-muted">{patient.admission_type}</p>
          </div>
        </div>
      </div>

      {/* Main content: 2 column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Vitals + Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Vital Cards */}
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-dark-text mb-3">Real-Time Vital Signs</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {VITAL_KEYS.map(key => (
                <VitalCard key={key} vitalKey={key} value={lastReading?.[key]} />
              ))}
            </div>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-sm text-gray-600 dark:text-dark-muted font-medium whitespace-nowrap">Time Range:</span>
            {TIME_RANGES.map(t => (
              <button
                key={t.hours}
                onClick={() => setTimeRange(t.hours)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === t.hours
                    ? 'bg-medical-blue text-white'
                    : 'bg-white dark:bg-dark-card text-gray-600 dark:text-dark-muted hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-dark-border'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {VITAL_KEYS.map(key => (
              <VitalChart key={`${key}-${timeRange}`} vitalKey={key} readings={readings} />
            ))}
          </div>

          {/* Treatment Simulation */}
          <TreatmentSimulator patientId={patientId} />

          {/* Export */}
          <ExportPanel patientId={patientId} patientData={patient} />
        </div>

        {/* Right: Risk Panel */}
        <div>
          <RiskPanel risk={risk} />
        </div>
      </div>
    </div>
  );
}
