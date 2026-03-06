import { useEffect, useRef } from 'react';

export function useVoiceAlerts(patients) {
  const prevStatuses = useRef({});
  const queue = useRef([]);
  const speaking = useRef(false);

  useEffect(() => {
    if (!patients || patients.length === 0) return;
    if (!('speechSynthesis' in window)) return;

    const speak = (text) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 1;
      utterance.onend = () => {
        speaking.current = false;
        if (queue.current.length > 0) {
          speak(queue.current.shift());
        }
      };
      speaking.current = true;
      window.speechSynthesis.speak(utterance);
    };

    const enqueue = (text) => {
      if (speaking.current) {
        queue.current.push(text);
      } else {
        speak(text);
      }
    };

    const prev = prevStatuses.current;

    for (const p of patients) {
      const id = p.patient_id;
      const oldStatus = prev[id];
      const newStatus = p.status;

      if (oldStatus && oldStatus !== 'critical' && newStatus === 'critical') {
        const name = p.name || `Patient ${id}`;
        const vitals = p.last_vitals;
        let detail = '';

        if (vitals) {
          if (vitals.spo2 !== null && vitals.spo2 < 90) detail = `SpO2 dropped to ${vitals.spo2}%`;
          else if (vitals.heart_rate !== null && (vitals.heart_rate > 130 || vitals.heart_rate < 40))
            detail = `Heart rate at ${vitals.heart_rate} BPM`;
          else if (vitals.respiration_rate !== null && vitals.respiration_rate > 30)
            detail = `Respiration rate at ${vitals.respiration_rate}`;
          else if (vitals.bp_systolic !== null && vitals.bp_systolic > 180)
            detail = `Blood pressure systolic at ${vitals.bp_systolic}`;
        }

        enqueue(`Alert! ${name} is now critical.${detail ? ' ' + detail + '.' : ''} Immediate attention required.`);
      }

      if (oldStatus === 'critical' && newStatus !== 'critical') {
        const name = p.name || `Patient ${id}`;
        enqueue(`${name} status improved to ${newStatus}.`);
      }

      prev[id] = newStatus;
    }
  }, [patients]);
}
