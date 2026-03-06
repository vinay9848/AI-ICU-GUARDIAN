import { useState, useEffect, useCallback } from 'react';
import { getRisk } from '../api/client';
import { useDemo } from '../context/DemoContext';

export function useRisk(patientId, refreshInterval = 60000) {
  const { demo, patients: demoPatients } = useDemo();
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (demo || !patientId) return;
    try {
      const res = await getRisk(patientId);
      setRisk(res.data);
    } catch (err) {
      console.error('Failed to fetch risk:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, demo]);

  useEffect(() => {
    if (demo) {
      setLoading(false);
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, demo]);

  if (demo) {
    const patient = demoPatients.find(p => String(p.patient_id) === String(patientId));
    const score = patient ? patient.risk_score : 0.15;
    const level = score > 0.7 ? 'HIGH' : score > 0.35 ? 'MEDIUM' : 'LOW';
    return {
      risk: {
        patient_id: patientId,
        risk_score: score,
        risk_level: level,
        contributing_factors: [
          { feature: 'heart_rate', importance: 0.3 },
          { feature: 'spo2', importance: 0.25 },
          { feature: 'respiration_rate', importance: 0.2 },
          { feature: 'bp_systolic', importance: 0.15 },
          { feature: 'temperature', importance: 0.1 },
        ],
      },
      loading: false,
    };
  }

  return { risk, loading };
}
