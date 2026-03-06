import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'deadManSwitch';
const ESCALATION_LEVELS = [
  { minutes: 5, level: 'warning', label: 'Warning', action: 'Nurse reminder' },
  { minutes: 10, level: 'urgent', label: 'Urgent', action: 'Charge nurse alerted' },
  { minutes: 15, level: 'emergency', label: 'Emergency', action: 'Doctor & department head paged' },
];

function loadCheckins() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveCheckins(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useDeadManSwitch(patients) {
  const [escalations, setEscalations] = useState({});
  const checkinsRef = useRef(loadCheckins());

  const checkin = useCallback((patientId) => {
    const data = { ...checkinsRef.current, [patientId]: Date.now() };
    checkinsRef.current = data;
    saveCheckins(data);
  }, []);

  useEffect(() => {
    if (!patients || patients.length === 0) return;

    const evaluate = () => {
      const now = Date.now();
      const checkins = checkinsRef.current;
      const newEscalations = {};

      for (const p of patients) {
        if (p.status !== 'critical') continue;
        const id = p.patient_id;
        const lastCheck = checkins[id] || 0;
        const minutesSince = (now - lastCheck) / 60000;

        let currentLevel = null;
        for (let i = ESCALATION_LEVELS.length - 1; i >= 0; i--) {
          if (minutesSince >= ESCALATION_LEVELS[i].minutes) {
            currentLevel = { ...ESCALATION_LEVELS[i], minutesSince: Math.round(minutesSince) };
            break;
          }
        }

        if (currentLevel) {
          newEscalations[id] = {
            patient: p,
            ...currentLevel,
          };
        }
      }

      setEscalations(newEscalations);
    };

    evaluate();
    const interval = setInterval(evaluate, 30000);
    return () => clearInterval(interval);
  }, [patients]);

  return { escalations, checkin, ESCALATION_LEVELS };
}
