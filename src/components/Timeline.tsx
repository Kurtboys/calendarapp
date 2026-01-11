import type { Goal } from '../types';
import { formatDuration } from '../utils/date';

interface TimelineProps {
  startTime: number;
  endTime: number;
  goals: Goal[];
  onGoalClick: (goalId: string) => void;
  onScheduleGoal: (goalId: string, hour: number) => void;
  onUnscheduleGoal: (goalId: string) => void;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function getHoursInRange(startTime: number, endTime: number): number[] {
  const hours: number[] = [];
  if (endTime > startTime) {
    // Same day: e.g., 7 AM to 10 PM
    for (let h = startTime; h < endTime; h++) {
      hours.push(h);
    }
  } else {
    // Overnight: e.g., 12 PM to 2 AM
    for (let h = startTime; h < 24; h++) {
      hours.push(h);
    }
    for (let h = 0; h < endTime; h++) {
      hours.push(h);
    }
  }
  return hours;
}

export function Timeline({
  startTime,
  endTime,
  goals,
  onGoalClick,
  onScheduleGoal,
  onUnscheduleGoal,
}: TimelineProps) {
  const hours = getHoursInRange(startTime, endTime);
  const scheduledGoals = goals.filter(g => g.scheduledTime !== undefined && !g.completed);

  // Group scheduled goals by hour
  const goalsByHour: Record<number, Goal[]> = {};
  scheduledGoals.forEach(goal => {
    const hour = goal.scheduledTime!;
    if (!goalsByHour[hour]) {
      goalsByHour[hour] = [];
    }
    goalsByHour[hour].push(goal);
  });

  const handleDrop = (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    const goalId = e.dataTransfer.getData('goalId');
    if (goalId) {
      onScheduleGoal(goalId, hour);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-1">
      {hours.map((hour, index) => {
        const isNextDay = endTime <= startTime && hour < startTime;
        const goalsAtHour = goalsByHour[hour] || [];

        return (
          <div
            key={`${hour}-${index}`}
            className="flex gap-3"
            onDrop={(e) => handleDrop(e, hour)}
            onDragOver={handleDragOver}
          >
            {/* Time label */}
            <div
              className="flex-shrink-0 w-20 py-3 text-right pr-3"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <span className="text-sm font-medium">
                {formatHour(hour)}
              </span>
              {isNextDay && (
                <span className="text-xs ml-1" style={{ color: 'var(--color-accent)' }}>
                  +1
                </span>
              )}
            </div>

            {/* Hour block */}
            <div
              className="flex-1 min-h-[60px] rounded-lg p-2 transition-colors"
              style={{
                backgroundColor: goalsAtHour.length > 0 ? 'var(--color-surface)' : 'transparent',
                border: `1px dashed ${goalsAtHour.length > 0 ? 'transparent' : 'var(--color-border)'}`,
              }}
            >
              {goalsAtHour.length > 0 ? (
                <div className="space-y-2">
                  {goalsAtHour.map(goal => (
                    <div
                      key={goal.id}
                      onClick={() => onGoalClick(goal.id)}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
                      style={{
                        backgroundColor: 'var(--color-accent-light)',
                        border: `2px solid var(--color-accent)`,
                      }}
                    >
                      {/* Play button */}
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-accent)' }}
                      >
                        <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>

                      {/* Title */}
                      <span
                        className="flex-1 font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {goal.title}
                      </span>

                      {/* Duration */}
                      <span
                        className="text-sm px-2 py-1 rounded"
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          color: 'white',
                        }}
                      >
                        {formatDuration(goal.duration)}
                      </span>

                      {/* Unschedule button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUnscheduleGoal(goal.id);
                        }}
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:scale-110"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-tertiary)',
                        }}
                        title="Remove from timeline"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className="h-full flex items-center justify-center text-sm"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Drop goal here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
