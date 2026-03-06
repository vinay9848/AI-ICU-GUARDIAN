import { Link, useLocation } from 'react-router-dom';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useState, useEffect } from 'react';
import { getPatients } from '../../api/client';

export default function Header() {
  const [dark, setDark] = useDarkMode();
  const location = useLocation();
  const [criticalCount, setCriticalCount] = useState(0);

  useEffect(() => {
    const fetchCritical = async () => {
      try {
        const res = await getPatients();
        setCriticalCount(res.data.filter(p => p.status === 'critical').length);
      } catch (e) { /* ignore */ }
    };
    fetchCritical();
    const interval = setInterval(fetchCritical, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-medical-blue dark:bg-gray-900 text-white px-4 sm:px-6 py-3 sm:py-4 shadow-lg transition-colors">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 sm:gap-3">
          <svg className="w-6 h-6 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <div>
            <h1 className="text-base sm:text-xl font-bold tracking-tight">AI ICU Guardian</h1>
            <p className="text-blue-200 dark:text-gray-400 text-[10px] sm:text-xs hidden sm:block">Patient Monitoring System</p>
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm font-medium">Live</span>
          </div>

          {/* Alert Center Button */}
          <Link
            to="/alerts"
            className={`relative p-2 rounded-lg transition-colors ${
              location.pathname === '/alerts' ? 'bg-white/25' : 'bg-white/10 hover:bg-white/20'
            }`}
            title="Alert Command Center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] animate-pulse">
                {criticalCount}
              </span>
            )}
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={() => setDark(d => !d)}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
