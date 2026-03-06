import { useState, useEffect, useCallback } from 'react';
import { getPatients } from '../api/client';
import { useDemo } from '../context/DemoContext';

export function usePatients(refreshInterval = 60000) {
  const { demo, patients: demoPatients } = useDemo();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (demo) return;
    try {
      const res = await getPatients();
      setPatients(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [demo]);

  useEffect(() => {
    if (demo) {
      setLoading(false);
      setError(null);
      return;
    }
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, demo]);

  return {
    patients: demo ? demoPatients : patients,
    loading: demo ? false : loading,
    error: demo ? null : error,
    refetch: fetchData,
  };
}
