import { useDayStart } from '../context/DayStartContext';
import { getEffectiveDate, getDayName, getMonthName } from '../utils/date';

export function StartDayOverlay() {
  const { startDay } = useDayStart();
  const effectiveDate = getEffectiveDate();

  const dayName = getDayName(effectiveDate);
  const monthName = getMonthName(effectiveDate);
  const dayNumber = effectiveDate.getDate();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="text-center px-6 max-w-md">
        {/* Date display */}
        <p
          className="text-sm font-medium uppercase tracking-wider mb-2"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {dayName}
        </p>
        <h1
          className="text-6xl font-bold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {monthName} {dayNumber}
        </h1>

        {/* Spacer */}
        <div className="h-16" />

        {/* Start day button */}
        <button
          onClick={startDay}
          className="group relative px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-100"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
          }}
        >
          Ready to Start the Day
        </button>

        {/* Subtle hint */}
        <p
          className="mt-6 text-sm"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Your day resets at 5:00 AM
        </p>
      </div>
    </div>
  );
}
