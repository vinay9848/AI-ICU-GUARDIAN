import { useState, useEffect, useCallback } from 'react';
import { getVitals } from '../api/client';
import { useDemo } from '../context/DemoContext';

export function useVitals(patientId, hours = 48, refreshInterval = 60000) {
  const { demo, vitalsHistory } = useDemo();
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (demo || !patientId) return;
    try {
      const res = await getVitals(patientId, 48);
      setVitals(res.data);
    } catch (err) {
      console.error('Failed to fetch vitals:', err);
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
    const readings = vitalsHistory[patientId] || [];
    return {
      vitals: { patient_id: patientId, stay_id: patientId, readings, total_readings: readings.length },
      loading: false,
    };
  }

  return { vitals, loading };
}
