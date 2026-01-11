import { useState, useEffect } from 'react';
import { useDayStart } from '../context/DayStartContext';

function formatTime(seconds: number): string {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return isNegative ? `-${timeStr}` : timeStr;
}

export function ActiveGoalModal() {
  const { activeGoal, dayConfig, completeActiveGoal, cancelActiveGoal, updateTimeCap } = useDayStart();
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isAdjustingTime, setIsAdjustingTime] = useState(false);

  const goal = dayConfig?.goals.find(g => g.id === activeGoal?.goalId);

  // Update remaining time every second
  useEffect(() => {
    if (!activeGoal) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - activeGoal.startedAt) / 1000);
      const total = activeGoal.timeCap * 60;
      setRemainingSeconds(total - elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeGoal]);

  if (!activeGoal || !goal) return null;

  const isOvertime = remainingSeconds < 0;
  const progress = Math.min(100, Math.max(0, ((activeGoal.timeCap * 60 - remainingSeconds) / (activeGoal.timeCap * 60)) * 100));

  const timeCapOptions = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div
        className="w-full max-w-lg mx-4 rounded-3xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {/* Header */}
        <div
          className="p-6 text-center"
          style={{
            backgroundColor: isOvertime ? 'var(--color-priority-urgent)' : 'var(--color-accent)',
          }}
        >
          <p className="text-white/80 text-sm font-medium mb-1">
            {isOvertime ? 'OVERTIME' : 'FOCUS MODE'}
          </p>
          <h2 className="text-white text-2xl font-bold">
            {goal.title}
          </h2>
        </div>

        {/* Timer display */}
        <div className="p-8 text-center">
          {/* Circular progress */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <svg className="w-48 h-48 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r="88"
                fill="none"
                stroke={isOvertime ? 'var(--color-priority-urgent)' : 'var(--color-accent)'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 88}
                strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
                className="transition-all duration-1000"
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-5xl font-bold tabular-nums ${isOvertime ? 'animate-pulse' : ''}`}
                style={{ color: isOvertime ? 'var(--color-priority-urgent)' : 'var(--color-text-primary)' }}
              >
                {formatTime(remainingSeconds)}
              </span>
              <span
                className="text-sm mt-1"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {isOvertime ? 'over time cap' : 'remaining'}
              </span>
            </div>
          </div>

          {/* Time cap adjuster */}
          {isAdjustingTime ? (
            <div className="mb-6">
              <p
                className="text-sm mb-3"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Adjust time cap:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {timeCapOptions.map(mins => (
                  <button
                    key={mins}
                    onClick={() => {
                      updateTimeCap(mins);
                      setIsAdjustingTime(false);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeGoal.timeCap === mins ? 'ring-2 ring-offset-2' : ''
                    }`}
                    style={{
                      backgroundColor: activeGoal.timeCap === mins ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: activeGoal.timeCap === mins ? 'white' : 'var(--color-text-primary)',
                    }}
                  >
                    {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsAdjustingTime(false)}
                className="mt-3 text-sm"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAdjustingTime(true)}
              className="mb-6 text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Time cap: {activeGoal.timeCap < 60 ? `${activeGoal.timeCap}m` : `${activeGoal.timeCap / 60}h`} (tap to adjust)
            </button>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={completeActiveGoal}
              className="w-full py-5 rounded-2xl text-2xl font-bold transition-all duration-200 hover:scale-[1.02] active:scale-100"
              style={{
                backgroundColor: 'var(--color-priority-low)',
                color: 'white',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
              }}
            >
              DONE
            </button>
            <button
              onClick={cancelActiveGoal}
              className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Cancel (keep in queue)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
