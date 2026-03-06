import { useState, useEffect, useCallback, useRef } from 'react';

const CONTACTS_KEY = 'alertContacts';
const HISTORY_KEY = 'alertHistory';

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}

function saveJSON(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useAlertNotifications(patients) {
  const [contacts, setContacts] = useState(() => loadJSON(CONTACTS_KEY, {}));
  const [history, setHistory] = useState(() => loadJSON(HISTORY_KEY, []));
  const [permissionGranted, setPermissionGranted] = useState(false);
  const prevStatuses = useRef({});

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setPermissionGranted(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(p => setPermissionGranted(p === 'granted'));
      }
    }
  }, []);

  // Save contacts when changed
  useEffect(() => { saveJSON(CONTACTS_KEY, contacts); }, [contacts]);
  useEffect(() => { saveJSON(HISTORY_KEY, history); }, [history]);

  const addContact = useCallback((patientId, contact) => {
    setContacts(prev => {
      const list = prev[patientId] || [];
      return { ...prev, [patientId]: [...list, { ...contact, id: Date.now() }] };
    });
  }, []);

  const removeContact = useCallback((patientId, contactId) => {
    setContacts(prev => {
      const list = (prev[patientId] || []).filter(c => c.id !== contactId);
      return { ...prev, [patientId]: list };
    });
  }, []);

  const addAlert = useCallback((alert) => {
    setHistory(prev => {
      const updated = [{ ...alert, id: Date.now(), time: new Date().toISOString() }, ...prev].slice(0, 100);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveJSON(HISTORY_KEY, []);
  }, []);

  // Send browser notification
  const sendBrowserNotification = useCallback((title, body, tag) => {
    if (!permissionGranted) return;
    try {
      const notif = new Notification(title, {
        body,
        icon: '/vite.svg',
        tag: tag || 'icu-alert',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
      });
      notif.onclick = () => { window.focus(); notif.close(); };
    } catch (e) {
      console.error('Notification error:', e);
    }
  }, [permissionGranted]);

  // Monitor patients for status changes and send alerts
  useEffect(() => {
    if (!patients || patients.length === 0) return;

    const prev = prevStatuses.current;

    for (const p of patients) {
      const id = p.patient_id;
      const oldStatus = prev[id];
      const newStatus = p.status;

      if (oldStatus && oldStatus !== 'critical' && newStatus === 'critical') {
        const name = p.name || `Patient ${id}`;
        const patientContacts = contacts[id] || [];

        // Browser notification
        sendBrowserNotification(
          'CRITICAL ALERT',
          `${name} is now CRITICAL! Immediate attention required.`,
          `critical-${id}`
        );

        // Log alert for each contact
        const alert = {
          patientId: id,
          patientName: name,
          type: 'critical',
          message: `${name} status changed to CRITICAL`,
          notifiedContacts: patientContacts.map(c => `${c.name} (${c.role})`),
        };
        addAlert(alert);

        // Log individual contact notifications
        patientContacts.forEach(c => {
          addAlert({
            patientId: id,
            patientName: name,
            type: 'notification_sent',
            message: `Alert sent to ${c.name} (${c.role}) at ${c.phone || c.email}`,
            notifiedContacts: [c.name],
          });
        });
      }

      if (oldStatus === 'critical' && newStatus !== 'critical') {
        const name = p.name || `Patient ${id}`;
        sendBrowserNotification(
          'Status Improved',
          `${name} is now ${newStatus}.`,
          `improved-${id}`
        );
        addAlert({
          patientId: id,
          patientName: name,
          type: 'improved',
          message: `${name} improved to ${newStatus}`,
          notifiedContacts: [],
        });
      }

      prev[id] = newStatus;
    }
  }, [patients, contacts, sendBrowserNotification, addAlert]);

  return {
    contacts,
    history,
    permissionGranted,
    addContact,
    removeContact,
    clearHistory,
    sendBrowserNotification,
  };
}
