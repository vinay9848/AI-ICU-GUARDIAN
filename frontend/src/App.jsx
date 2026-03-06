import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import PatientDetail from './pages/PatientDetail';
import AlertsCenter from './pages/AlertsCenter';
import { usePatients } from './hooks/usePatients';
import { useVoiceAlerts } from './hooks/useVoiceAlerts';
import { useAlertNotifications } from './hooks/useAlertNotifications';

function AppContent() {
  const { patients } = usePatients(5000);

  // Global voice alerts & notifications — active on ALL pages
  useVoiceAlerts(patients);
  useAlertNotifications(patients);

  return (
    <div className="min-h-screen bg-light-grey dark:bg-dark-bg transition-colors">
      <Header />
      <main className="p-6 max-w-[1600px] mx-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/alerts" element={<AlertsCenter />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
