import { useState, useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useDayStart } from '../context/DayStartContext';
import type { ViewType, DynamicViewConfig } from '../types';
import { getEffectiveDate, addDays, startOfWeek, startOfMonth, endOfMonth } from '../utils/date';

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
  const { bottleneckedMissions } = useDayStart();
  const [showMeInput, setShowMeInput] = useState('');
  const [showMeError, setShowMeError] = useState(false);

  const handleShowMeSubmit = useCallback(() => {
    const config = parseShowMe(showMeInput);
    if (config) {
      onDynamicViewChange(config);
      onViewChange('dynamic');
      setShowMeInput('');
      setShowMeError(false);
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
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const showNavigation = currentView !== 'bottleneck' && currentView !== 'scheduler';

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

        {/* Show me input */}
        <div className="flex items-center gap-2">
          <span
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Show me
          </span>
          <input
            type="text"
            value={showMeInput}
            onChange={(e) => setShowMeInput(e.target.value)}
            onKeyDown={handleShowMeKeyDown}
            placeholder="next 5 days, this week..."
            className="px-3 py-1.5 rounded-lg text-sm w-44"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: `1px solid ${showMeError ? 'var(--color-priority-urgent)' : 'var(--color-border)'}`,
            }}
          />
          <button
            onClick={handleShowMeSubmit}
            className="p-1.5 rounded-lg transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              backgroundColor: 'var(--color-surface)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-surface)'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
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
