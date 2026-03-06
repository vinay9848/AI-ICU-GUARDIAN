import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 60000,
});

export const getPatients = (status) =>
  api.get('/patients/', { params: status ? { status } : {} });

export const getPatient = (id) =>
  api.get(`/patients/${id}`);

export const getVitals = (id, hours = 48) =>
  api.get(`/patients/${id}/vitals`, { params: { hours } });

export const getRisk = (id) =>
  api.get(`/patients/${id}/risk`);

export const getTreatments = (id) =>
  api.get(`/patients/${id}/treatments`);

export const simulateTreatment = (id, treatment, hours = 6) =>
  api.post(`/patients/${id}/simulate`, { treatment, hours });

// Alert system endpoints
export const getAlertContacts = (patientId) =>
  patientId ? api.get(`/alerts/contacts/${patientId}`) : api.get('/alerts/contacts');

export const addAlertContact = (patientId, contact) =>
  api.post(`/alerts/contacts/${patientId}`, contact);

export const removeAlertContact = (patientId, contactId) =>
  api.delete(`/alerts/contacts/${patientId}/${contactId}`);

export const alertCheckin = (patientId) =>
  api.post('/alerts/checkin', { patient_id: patientId });

export const getEscalations = () =>
  api.get('/alerts/escalations');

export const triggerAlert = (patientId, alertType, message, patientName) =>
  api.post('/alerts/trigger', { patient_id: patientId, alert_type: alertType, message, patient_name: patientName });

export const getAlertHistory = (limit = 50) =>
  api.get('/alerts/history', { params: { limit } });

export default api;
