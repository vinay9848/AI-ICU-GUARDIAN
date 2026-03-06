import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import PatientDetail from './pages/PatientDetail';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-light-grey dark:bg-dark-bg transition-colors">
        <Header />
        <main className="p-6 max-w-[1600px] mx-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients/:id" element={<PatientDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
