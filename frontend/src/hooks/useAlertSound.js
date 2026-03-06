import { useRef, useEffect, useCallback } from 'react';

// Generate alert beep using Web Audio API (no external files needed)
function createBeep(frequency = 800, duration = 0.15, count = 3) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const now = ctx.currentTime;

  for (let i = 0; i < count; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.frequency.value = frequency;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, now + i * (duration + 0.1));
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * (duration + 0.1) + duration);

    osc.start(now + i * (duration + 0.1));
    osc.stop(now + i * (duration + 0.1) + duration);
  }
}

function sendBrowserNotification(title, body) {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/vite.svg',
      tag: 'icu-alert',
      requireInteraction: true,
    });
  }
}

export function useAlertSound(patients) {
  const prevCriticalRef = useRef(null);
  const hasInteracted = useRef(false);

  // Request notification permission on first user interaction
  useEffect(() => {
    const handler = () => {
      hasInteracted.current = true;
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    };
    window.addEventListener('click', handler, { once: true });
    return () => window.removeEventListener('click', handler);
  }, []);

  const checkAlerts = useCallback(() => {
    if (!patients || patients.length === 0) return;

    const currentCritical = new Set(
      patients.filter(p => p.status === 'critical').map(p => p.patient_id)
    );

    // First run: seed the set without alerting
    if (prevCriticalRef.current === null) {
      prevCriticalRef.current = currentCritical;
      return;
    }

    // Find newly critical patients (not in previous set)
    const newCritical = [...currentCritical].filter(id => !prevCriticalRef.current.has(id));

    if (newCritical.length > 0) {
      // Play alert sound
      try { createBeep(800, 0.15, 3); } catch (e) { /* audio blocked */ }

      // Send browser notification
      const names = newCritical.map(id => {
        const p = patients.find(pt => pt.patient_id === id);
        return p?.name || `ICU-${id}`;
      });

      sendBrowserNotification(
        'CRITICAL ICU ALERT',
        `${names.join(', ')} — immediate attention required`
      );
    }

    prevCriticalRef.current = currentCritical;
  }, [patients]);

  useEffect(() => {
    checkAlerts();
  }, [checkAlerts]);
}
