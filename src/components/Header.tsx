import { useState, useCallback, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useDayStart } from '../context/DayStartContext';
import type { ViewType, DynamicViewConfig } from '../types';
import { getEffectiveDate, addDays, startOfWeek, startOfMonth, endOfMonth } from '../utils/date';

// Preset day view options
const PRESET_VIEWS = [
  { label: '5 Days', days: 5 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
];

interface HeaderProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  currentDate: Date;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  dynamicConfig: DynamicViewConfig | null;
  onDynamicViewChange: (config: DynamicViewConfig) => void;
}

// Parse natural language into a view configuration
function parseShowMe(input: string): DynamicViewConfig | null {
  const text = input.toLowerCase().trim();
  const today = getEffectiveDate();

  // "this week" - from today to end of week (Sunday)
  if (text.includes('this week')) {
    const endOfWeek = startOfWeek(addDays(today, 7));
    const daysUntilEnd = Math.ceil((endOfWeek.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { label: 'This Week', days: Math.max(daysUntilEnd, 1), startDate: today };
  }

  // "next week" - next Monday to Sunday
  if (text.includes('next week')) {
    const nextMonday = addDays(startOfWeek(today, 1), 7);
    return { label: 'Next Week', days: 7, startDate: nextMonday };
  }

  // "this month" - from today to end of month
  if (text.includes('this month')) {
    const monthEnd = endOfMonth(today);
    const daysLeft = Math.ceil((monthEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { label: 'This Month', days: Math.max(daysLeft, 1), startDate: today };
  }

  // "next month" - entire next month
  if (text.includes('next month')) {
    const nextMonthStart = startOfMonth(addDays(endOfMonth(today), 1));
    const nextMonthEnd = endOfMonth(nextMonthStart);
    const days = Math.ceil((nextMonthEnd.getTime() - nextMonthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { label: 'Next Month', days, startDate: nextMonthStart };
  }

  // "next X days" or "X days"
  const daysMatch = text.match(/(?:next\s+)?(\d+)\s*days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    if (days > 0 && days <= 365) {
      return { label: `Next ${days} Days`, days, startDate: today };
    }
  }

  // "next X weeks" or "X weeks"
  const weeksMatch = text.match(/(?:next\s+)?(\d+)\s*weeks?/);
  if (weeksMatch) {
    const weeks = parseInt(weeksMatch[1], 10);
    if (weeks > 0 && weeks <= 52) {
      return { label: `Next ${weeks} Week${weeks > 1 ? 's' : ''}`, days: weeks * 7, startDate: today };
    }
  }

  // "tomorrow"
  if (text === 'tomorrow') {
    return { label: 'Tomorrow', days: 1, startDate: addDays(today, 1) };
  }

  // "weekend"
  if (text.includes('weekend')) {
    const dayOfWeek = today.getDay();
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const saturday = addDays(today, daysUntilSaturday);
    return { label: 'Weekend', days: 2, startDate: saturday };
  }

  return null;
}

export function Header({
  currentView,
  onViewChange,
  currentDate,
  onNavigate,
  dynamicConfig,
  onDynamicViewChange,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { bottleneckedMissions, startLogout, completedMissions } = useDayStart();
  const [showMeInput, setShowMeInput] = useState('');
  const [showMeError, setShowMeError] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDynamicInput, setShowDynamicInput] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowDynamicInput(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleShowMeSubmit = useCallback(() => {
    const config = parseShowMe(showMeInput);
    if (config) {
      onDynamicViewChange(config);
      onViewChange('dynamic');
      setShowMeInput('');
      setShowMeError(false);
      setShowDropdown(false);
      setShowDynamicInput(false);
    } else {
      setShowMeError(true);
      setTimeout(() => setShowMeError(false), 2000);
    }
  }, [showMeInput, onDynamicViewChange, onViewChange]);

  const handleShowMeKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleShowMeSubmit();
    }
  }, [handleShowMeSubmit]);

  const handlePresetSelect = useCallback((days: number, label: string) => {
    const today = getEffectiveDate();
    const config: DynamicViewConfig = { label, days, startDate: today };
    onDynamicViewChange(config);
    onViewChange('dynamic');
    setShowDropdown(false);
  }, [onDynamicViewChange, onViewChange]);

  const getDateLabel = () => {
    if (currentView === 'dynamic' && dynamicConfig) {
      return dynamicConfig.label;
    }
    if (currentView === 'scheduler') {
      return 'Scheduler';
    }
    if (currentView === 'bottleneck') {
      return 'Bottlenecks';
    }
    if (currentView === 'completed') {
      return 'Completed';
    }
    if (currentView === 'settings') {
      return 'Settings';
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const showNavigation = currentView !== 'bottleneck' && currentView !== 'scheduler' && currentView !== 'completed' && currentView !== 'settings';

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

        {showNavigation && (
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
        )}

        {!showNavigation && (
          <span
            className="text-lg font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {getDateLabel()}
          </span>
        )}
      </div>

      {/* Center section - View switcher */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1 p-1 rounded-lg"
          style={{ backgroundColor: 'var(--color-surface)' }}
        >
          {/* Today */}
          <button
            onClick={() => onViewChange('today')}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: currentView === 'today' ? 'var(--color-background)' : 'transparent',
              color: currentView === 'today' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: currentView === 'today' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            Today
          </button>

          {/* 3 Day */}
          <button
            onClick={() => onViewChange('3day')}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: currentView === '3day' ? 'var(--color-background)' : 'transparent',
              color: currentView === '3day' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              boxShadow: currentView === '3day' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            3 Day
          </button>

          {/* Bottlenecks */}
          <button
            onClick={() => onViewChange('bottleneck')}
            className="relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: currentView === 'bottleneck' ? 'var(--color-background)' : 'transparent',
              color: currentView === 'bottleneck' ? 'var(--color-priority-high)' : 'var(--color-text-secondary)',
              boxShadow: currentView === 'bottleneck' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <span className="flex items-center gap-1">
              Bottlenecks
            </span>
            {bottleneckedMissions.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-priority-urgent)',
                  color: 'white',
                }}
              >
                {bottleneckedMissions.length}
              </span>
            )}
          </button>

          {/* Scheduler */}
          <button
            onClick={() => onViewChange('scheduler')}
            className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: currentView === 'scheduler' ? 'var(--color-background)' : 'transparent',
              color: currentView === 'scheduler' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              boxShadow: currentView === 'scheduler' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Scheduler
            </span>
          </button>

          {/* Completed */}
          <button
            onClick={() => onViewChange('completed')}
            className="relative px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: currentView === 'completed' ? 'var(--color-background)' : 'transparent',
              color: currentView === 'completed' ? 'var(--color-priority-low)' : 'var(--color-text-secondary)',
              boxShadow: currentView === 'completed' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
            }}
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Completed
            </span>
            {completedMissions.length > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                style={{
                  backgroundColor: 'var(--color-priority-low)',
                  color: 'white',
                }}
              >
                {completedMissions.length > 99 ? '99+' : completedMissions.length}
              </span>
            )}
          </button>

          {/* Dynamic view indicator */}
          {currentView === 'dynamic' && dynamicConfig && (
            <span
              className="px-3 py-1.5 rounded-md text-sm font-medium"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-accent)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              {dynamicConfig.label}
            </span>
          )}
        </div>

        {/* Show me dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <span>Show me</span>
            <svg
              className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDropdown && (
            <div
              className="absolute top-full mt-1 right-0 w-48 rounded-lg shadow-lg overflow-hidden z-50"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
              }}
            >
              {PRESET_VIEWS.map((preset) => (
                <button
                  key={preset.days}
                  onClick={() => handlePresetSelect(preset.days, preset.label)}
                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--color-text-primary)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {preset.label}
                </button>
              ))}
              <div
                className="border-t"
                style={{ borderColor: 'var(--color-border)' }}
              />
              {!showDynamicInput ? (
                <button
                  onClick={() => setShowDynamicInput(true)}
                  className="w-full px-4 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--color-accent)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  Dynamic...
                </button>
              ) : (
                <div className="p-2">
                  <input
                    type="text"
                    value={showMeInput}
                    onChange={(e) => setShowMeInput(e.target.value)}
                    onKeyDown={handleShowMeKeyDown}
                    placeholder="this week, next month..."
                    autoFocus
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      border: `1px solid ${showMeError ? 'var(--color-priority-urgent)' : 'var(--color-border)'}`,
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right section - Theme toggle and Logout */}
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

        <button
          onClick={startLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all hover:scale-[1.02]"
          style={{
            backgroundColor: 'var(--color-priority-medium)',
            color: 'white',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
