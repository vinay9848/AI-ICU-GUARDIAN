import api from '../api/client';

export async function sendCriticalAlert({ patientName, patientId, vitalDetails, contactName, contactEmail }) {
  try {
    const result = await api.post('/alerts/send-email', {
      patient_name: patientName,
      patient_id: patientId,
      vital_details: vitalDetails || 'Vital signs exceeded critical thresholds',
      contact_name: contactName,
      contact_email: contactEmail,
      dashboard_url: window.location.origin + `/patients/${patientId}`,
    });
    console.log('Email alert sent:', result.data);
    return result.data;
  } catch (error) {
    console.error('Email alert failed:', error);
    return null;
  }
}

export async function sendStatusUpdate({ patientName, patientId, newStatus, contactName, contactEmail }) {
  try {
    const result = await api.post('/alerts/send-status-email', {
      patient_name: patientName,
      patient_id: patientId,
      new_status: newStatus,
      contact_name: contactName,
      contact_email: contactEmail,
      dashboard_url: window.location.origin + `/patients/${patientId}`,
    });
    return result.data;
  } catch (error) {
    console.error('Email status update failed:', error);
    return null;
  }
}
