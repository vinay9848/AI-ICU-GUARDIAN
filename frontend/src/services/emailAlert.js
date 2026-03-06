import emailjs from '@emailjs/browser';

// EmailJS configuration — update these after setting up your EmailJS account
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || '';
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

let initialized = false;

function init() {
  if (initialized || !EMAILJS_PUBLIC_KEY) return;
  emailjs.init(EMAILJS_PUBLIC_KEY);
  initialized = true;
}

export function isEmailConfigured() {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
}

export async function sendCriticalAlert({ patientName, patientId, vitalDetails, contactName, contactEmail }) {
  init();
  if (!isEmailConfigured()) {
    console.warn('EmailJS not configured — skipping email alert');
    return null;
  }

  try {
    const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: contactName,
      to_email: contactEmail,
      patient_name: patientName,
      patient_id: patientId,
      vital_details: vitalDetails || 'Vital signs exceeded critical thresholds',
      alert_time: new Date().toLocaleString(),
      dashboard_url: window.location.origin + `/patients/${patientId}`,
    });
    console.log('Email alert sent:', result.text);
    return result;
  } catch (error) {
    console.error('Email alert failed:', error);
    return null;
  }
}

export async function sendStatusUpdate({ patientName, patientId, newStatus, contactName, contactEmail }) {
  init();
  if (!isEmailConfigured()) return null;

  try {
    const result = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_name: contactName,
      to_email: contactEmail,
      patient_name: patientName,
      patient_id: patientId,
      vital_details: `Status improved to ${newStatus}`,
      alert_time: new Date().toLocaleString(),
      dashboard_url: window.location.origin + `/patients/${patientId}`,
    });
    return result;
  } catch (error) {
    console.error('Email status update failed:', error);
    return null;
  }
}
