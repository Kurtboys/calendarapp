import { useDayStart } from '../../context/DayStartContext';
import { getDateRange, getDayName, getMonthName, formatDate, getEffectiveDate, formatDuration } from '../../utils/date';

interface MultiDayViewProps {
  startDate: Date;
  days: number;
}

export function MultiDayView({ startDate, days }: MultiDayViewProps) {
  const { dayConfig, getAssignedMissions, getUnassignedMissions } = useDayStart();

  const dates = getDateRange(startDate, days);
  const effectiveDate = getEffectiveDate();
  const todayStr = formatDate(effectiveDate);
  const configDateStr = dayConfig?.date;

  // Get missions for today only (we don't have multi-day scheduling yet)
  const assignedMissions = getAssignedMissions();
  const unassignedMissions = getUnassignedMissions();

  return (
    <div className="h-full p-6 overflow-auto">
      <div
        className="grid gap-4 min-h-full"
        style={{
          gridTemplateColumns: `repeat(${Math.min(days, 7)}, minmax(200px, 1fr))`,
        }}
      >
        {dates.map((date) => {
          const dateStr = formatDate(date);
          const isToday = dateStr === todayStr;
          const hasMissions = isToday && configDateStr === todayStr;

          return (
            <div
              key={dateStr}
              className="rounded-xl overflow-hidden flex flex-col"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: `2px solid ${isToday ? 'var(--color-accent)' : 'var(--color-border)'}`,
              }}
            >
              {/* Date header */}
              <div
                className="p-3 border-b"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: isToday ? 'var(--color-accent-light)' : 'transparent',
                }}
              >
                <p
                  className="text-xs font-medium uppercase"
                  style={{ color: isToday ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}
                >
                  {getDayName(date)}
                </p>
                <p
                  className="text-lg font-bold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {getMonthName(date).slice(0, 3)} {date.getDate()}
                </p>
              </div>

              {/* Day content */}
              <div className="flex-1 p-3 overflow-auto">
                {hasMissions ? (
                  <div className="space-y-2">
                    {assignedMissions.map((mission) => (
                      <div
                        key={mission.id}
                        className="p-2 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-priority-low)',
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-priority-low)',
                              color: 'white',
                            }}
                          >
                            #{mission.missionNumber}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: 'var(--color-text-tertiary)' }}
                          >
                            {formatDuration(mission.duration)}
                          </span>
                        </div>
                        <p
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {mission.title}
                        </p>
                      </div>
                    ))}
                    {unassignedMissions.map((mission) => (
                      <div
                        key={mission.id}
                        className="p-2 rounded-lg opacity-60"
                        style={{
                          backgroundColor: 'var(--color-background)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <p
                          className="text-sm truncate"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {mission.title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          Not scheduled
                        </p>
                      </div>
                    ))}
                    {assignedMissions.length === 0 && unassignedMissions.length === 0 && (
                      <p
                        className="text-sm text-center py-4"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        No missions
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p
                      className="text-sm text-center"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {date < effectiveDate ? 'Past' : 'Future'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
