import { useState } from 'react';
import { useDayStart } from '../context/DayStartContext';
import { getEffectiveDate, getDayName, getMonthName, getDayStartHour, setDayStartHour } from '../utils/date';

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function ReadyStep({ onProceed }: { onProceed: () => void }) {
  const [dayStartHour, setDayStartHourState] = useState(getDayStartHour);
  const effectiveDate = getEffectiveDate();
  const dayName = getDayName(effectiveDate);
  const monthName = getMonthName(effectiveDate);
  const dayNumber = effectiveDate.getDate();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleDayStartChange = (hour: number) => {
    setDayStartHourState(hour);
    setDayStartHour(hour);
  };

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

      <div className="h-16" />

      <button
        onClick={onProceed}
        className="px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-100"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'white',
          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
        }}
      >
        Ready to Start the Day
      </button>

      <div className="mt-6 flex items-center justify-center gap-2">
        <span
          className="text-sm"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Your day resets at
        </span>
        <select
          value={dayStartHour}
          onChange={(e) => handleDayStartChange(Number(e.target.value))}
          className="px-2 py-1 rounded-lg text-sm font-medium cursor-pointer"
          style={{
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
            border: `1px solid var(--color-border)`,
          }}
        >
          {hours.map((h) => (
            <option key={h} value={h}>
              {formatHour(h)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function ConfigureStep({ onComplete }: { onComplete: (startTime: number, endTime: number) => void }) {
  const [startTime, setStartTime] = useState(7); // Default 7 AM
  const [endTime, setEndTime] = useState(22); // Default 10 PM

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleSubmit = () => {
    onComplete(startTime, endTime);
  };

  return (
    <div className="px-6 max-w-lg w-full">
      <h2
        className="text-2xl font-semibold text-center mb-2"
        style={{ color: 'var(--color-text-primary)' }}
      >
        Set Your Day Window
      </h2>
      <p
        className="text-center mb-10"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        When do you want to start and end your productive day?
      </p>

      <div className="flex items-center justify-center gap-6 mb-12">
        {/* Start Time */}
        <div className="flex flex-col items-center">
          <label
            className="text-sm font-medium mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Start
          </label>
          <select
            value={startTime}
            onChange={(e) => setStartTime(Number(e.target.value))}
            className="px-4 py-3 rounded-xl text-lg font-medium appearance-none cursor-pointer min-w-[120px] text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: `2px solid var(--color-border)`,
            }}
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {formatHour(h)}
              </option>
            ))}
          </select>
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
            End {endTime <= startTime && endTime !== startTime && (
              <span style={{ color: 'var(--color-accent)' }}>(+1 day)</span>
            )}
          </label>
          <select
            value={endTime}
            onChange={(e) => setEndTime(Number(e.target.value))}
            className="px-4 py-3 rounded-xl text-lg font-medium appearance-none cursor-pointer min-w-[120px] text-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: `2px solid var(--color-border)`,
            }}
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {formatHour(h)}
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
        {endTime > startTime
          ? `${endTime - startTime} hours of productive time`
          : endTime < startTime
          ? `${24 - startTime + endTime} hours (ends tomorrow)`
          : 'Please select different times'}
      </p>

      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={startTime === endTime}
          className="px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-200 hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'white',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
          }}
        >
          Let's Go
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
