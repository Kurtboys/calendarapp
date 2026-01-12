import { useState } from 'react';
import { useDayStart } from '../context/DayStartContext';
import { getEffectiveDate, getDayName, getMonthName, getCurrentHour } from '../utils/date';

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function ReadyStep({ onProceed }: { onProceed: () => void }) {
  const effectiveDate = getEffectiveDate();
  const dayName = getDayName(effectiveDate);
  const monthName = getMonthName(effectiveDate);
  const dayNumber = effectiveDate.getDate();
  const currentHour = getCurrentHour();

  return (
    <div className="text-center px-6 max-w-md">
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

      <p
        className="mt-4 text-lg"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Starting at {formatHour(currentHour)}
      </p>

      <div className="h-12" />

      <button
        onClick={onProceed}
        className="px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-100"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'white',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
        }}
      >
        Login
      </button>

      <p
        className="mt-6 text-sm"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        Day resets at 2 AM
      </p>
    </div>
  );
}

function ConfigureStep({ onComplete }: { onComplete: (endTime: number) => void }) {
  const currentHour = getCurrentHour();
  // Default end time: if before 6 PM, default to 10 PM; otherwise default to 2 AM
  const defaultEnd = currentHour < 18 ? 22 : 2;
  const [endTime, setEndTime] = useState(defaultEnd);

  // Generate hours from current hour to 2 AM the next day
  const getAvailableHours = () => {
    const hours: { value: number; label: string; isNextDay: boolean }[] = [];

    // From current hour to midnight
    for (let h = currentHour + 1; h < 24; h++) {
      hours.push({ value: h, label: formatHour(h), isNextDay: false });
    }

    // From midnight to 2 AM (next day)
    for (let h = 0; h <= 2; h++) {
      hours.push({ value: h, label: formatHour(h), isNextDay: true });
    }

    return hours;
  };

  const availableHours = getAvailableHours();
  const selectedIsNextDay = endTime <= 2;

  // Calculate productive hours
  const getProductiveHours = () => {
    if (endTime > currentHour) {
      return endTime - currentHour;
    } else {
      return (24 - currentHour) + endTime;
    }
  };

  const handleSubmit = () => {
    onComplete(endTime);
  };

  return (
    <div className="px-6 max-w-lg w-full">
      <h2
        className="text-2xl font-semibold text-center mb-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        How late are you working?
      </h2>
      <p
        className="text-center mb-8"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Starting now at {formatHour(currentHour)}
      </p>

      <div className="flex items-center justify-center gap-6 mb-8">
        {/* Current Time (read-only) */}
        <div className="flex flex-col items-center">
          <label
            className="text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Now
          </label>
          <div
            className="px-4 py-3 rounded-xl text-lg font-medium min-w-[120px] text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: `2px solid var(--color-border)`,
            }}
          >
            {formatHour(currentHour)}
          </div>
        </div>

        {/* Arrow */}
        <div
          className="text-2xl mt-6"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          →
        </div>

        {/* End Time */}
        <div className="flex flex-col items-center">
          <label
            className="text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Until {selectedIsNextDay && (
              <span style={{ color: 'var(--color-accent)' }}>(tomorrow)</span>
            )}
          </label>
          <select
            value={endTime}
            onChange={(e) => setEndTime(Number(e.target.value))}
            className="px-4 py-3 rounded-xl text-lg font-medium appearance-none cursor-pointer min-w-[120px] text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: `2px solid var(--color-accent)`,
            }}
          >
            {availableHours.map((h) => (
              <option key={`${h.value}-${h.isNextDay}`} value={h.value}>
                {h.label}{h.isNextDay ? ' (+1)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Duration info */}
      <p
        className="text-center mb-8"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {getProductiveHours()} hours of productive time
      </p>

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          className="px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-100"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
          }}
        >
          Start Day
        </button>
      </div>
    </div>
  );
}

export function StartDayOverlay() {
  const { step, proceedToConfig, completeSetup } = useDayStart();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      {step === 'ready' && <ReadyStep onProceed={proceedToConfig} />}
      {step === 'configure' && <ConfigureStep onComplete={completeSetup} />}
    </div>
  );
}
