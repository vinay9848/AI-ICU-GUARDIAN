import { useState, useEffect, useRef, useCallback } from 'react';

const VOICE_KEY = 'voiceAlertsEnabled';

export function useVoiceAlerts(patients) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(VOICE_KEY) === 'true');
  const prevStatuses = useRef({});
  const queue = useRef([]);
  const speaking = useRef(false);

  useEffect(() => {
    localStorage.setItem(VOICE_KEY, enabled);
  }, [enabled]);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    utterance.onend = () => {
      speaking.current = false;
      processQueue();
    };
    speaking.current = true;
    window.speechSynthesis.speak(utterance);
  }, []);

  const processQueue = useCallback(() => {
    if (speaking.current || queue.current.length === 0) return;
    const next = queue.current.shift();
    speak(next);
  }, [speak]);

  const enqueue = useCallback((text) => {
    queue.current.push(text);
    processQueue();
  }, [processQueue]);

  useEffect(() => {
    if (!enabled || !patients || patients.length === 0) return;

    const prev = prevStatuses.current;
    const alerts = [];

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

        const msg = `Alert! ${name} is now critical.${detail ? ' ' + detail + '.' : ''} Immediate attention required.`;
        alerts.push(msg);
      }

      if (oldStatus === 'critical' && newStatus !== 'critical') {
        const name = p.name || `Patient ${id}`;
        alerts.push(`${name} status improved to ${newStatus}.`);
      }

      prev[id] = newStatus;
    }

    alerts.forEach(a => enqueue(a));
  }, [patients, enabled, enqueue]);

  const toggle = useCallback(() => setEnabled(e => !e), []);
  const testVoice = useCallback(() => {
    speak('Voice alerts are active. You will be notified when a patient becomes critical.');
  }, [speak]);

  return { enabled, toggle, testVoice };
}
