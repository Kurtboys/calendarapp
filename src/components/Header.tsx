import { useTheme } from '../context/ThemeContext';
import type { ViewType } from '../types';

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  currentDate: Date;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
}

const viewLabels: Record<ViewType, string> = {
  today: 'Today',
  '3day': '3 Day',
  '5day': '5 Day',
  '7day': 'Week',
  '30day': 'Month',
  year: 'Year',
};

export function Header({ currentView, onViewChange, currentDate, onNavigate }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  const getDateLabel = () => {
    if (currentView === 'year') {
      return currentDate.getFullYear().toString();
    }
    if (currentView === '30day') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <header
      className="flex-shrink-0 h-16 flex items-center justify-between px-6"
      style={{ borderBottom: `1px solid var(--color-border)` }}
    >
      {/* Left section - Logo and navigation */}
      <div className="flex items-center gap-6">
        <h1
          className="text-xl font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Focus
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('prev')}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onNavigate('today')}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              border: `1px solid var(--color-border)`,
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Today
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span
            className="ml-2 text-lg font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {getDateLabel()}
          </span>
        </div>
      </div>

      {/* Center section - View switcher */}
      <div
        className="flex items-center gap-1 p-1 rounded-lg"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {(Object.keys(viewLabels) as ViewType[]).map((view) => (
          <button
            key={view}
            onClick={() => onViewChange(view)}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: currentView === view ? 'var(--color-background)' : 'transparent',
              color: currentView === view ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: currentView === view ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            {viewLabels[view]}
          </button>
        ))}
      </div>

      {/* Right section - Theme toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {theme === 'light' ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
