import { Link } from 'react-router-dom';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useDemo } from '../../context/DemoContext';

export default function Header() {
  const [dark, setDark] = useDarkMode();
  const { demo, toggle } = useDemo();

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
          {/* Demo mode toggle */}
          <div className="flex items-center gap-2 border border-white/20 rounded-full px-3 py-1.5">
            <span className={`text-xs font-semibold ${!demo ? 'text-green-400' : 'text-white/50'}`}>Live</span>
            <button
              onClick={toggle}
              className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${
                demo ? 'bg-amber-500' : 'bg-green-500'
              }`}
              title={demo ? 'Switch to live data' : 'Switch to demo mode'}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                demo ? 'left-7' : 'left-1'
              }`} />
            </button>
            <span className={`text-xs font-semibold ${demo ? 'text-amber-400' : 'text-white/50'}`}>Demo</span>
          </div>

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
