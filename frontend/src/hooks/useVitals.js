import { useState, useEffect, useCallback } from 'react';
import { getVitals } from '../api/client';

export function useVitals(patientId, hours = 48, refreshInterval = 60000) {
  const [vitals, setVitals] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await getVitals(patientId, hours);
      setVitals(res.data);
    } catch (err) {
      console.error('Failed to fetch vitals:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId, hours]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { vitals, loading };
}
