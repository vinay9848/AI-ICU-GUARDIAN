import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 15000,
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

export default api;
