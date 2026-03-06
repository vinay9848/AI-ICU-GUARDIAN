import { useState, useEffect, useCallback } from 'react';
import { getRisk } from '../api/client';

export function useRisk(patientId, refreshInterval = 60000) {
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await getRisk(patientId);
      setRisk(res.data);
    } catch (err) {
      console.error('Failed to fetch risk:', err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  return { risk, loading };
}
