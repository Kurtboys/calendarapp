import { useMemo } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { formatDuration } from '../../utils/date';

export function CompletedView() {
  const { completedMissions } = useDayStart();

  // Group completed missions by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof completedMissions> = {};

    completedMissions.forEach((mission) => {
      const date = mission.completedDate;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(mission);
    });

    // Sort dates in descending order (most recent first)
    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, missions]) => ({
        date,
        missions: missions.sort((a, b) => b.completedAt.localeCompare(a.completedAt)),
      }));
  }, [completedMissions]);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) {
      return 'Today';
    } else if (dateStr === yesterdayStr) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (completedMissions.length === 0) {
    return (
      <div
        className="h-full flex items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        <div
          className="text-center p-8 rounded-2xl max-w-md"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-background)' }}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2
            className="text-xl font-semibold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No Completed Missions Yet
          </h2>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Complete some missions and they'll show up here for reference.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-auto p-6"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Completed Missions
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {completedMissions.length} mission{completedMissions.length !== 1 ? 's' : ''} completed
          </p>
        </div>

        {/* Grouped by date */}
        {groupedByDate.map(({ date, missions }) => (
          <div key={date}>
            {/* Date header */}
            <h2
              className="text-lg font-semibold mb-4 pb-2 border-b"
              style={{
                color: 'var(--color-text-primary)',
                borderColor: 'var(--color-border)',
              }}
            >
              {formatDateHeader(date)}
              <span
                className="ml-2 text-sm font-normal"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                ({missions.length} mission{missions.length !== 1 ? 's' : ''})
              </span>
            </h2>

            {/* Missions */}
            <div className="space-y-3">
              {missions.map((mission) => (
                <div
                  key={mission.id}
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-priority-low)' }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="white"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3
                        className="font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {mission.title}
                      </h3>
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      {formatTime(mission.completedAt)}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-4 text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <span>
                      Time cap: {formatDuration(mission.duration)}
                    </span>
                    <span>
                      Actual: {formatDuration(mission.timeSpent)}
                    </span>
                    {mission.checkpoints.length > 0 && (
                      <span>
                        {mission.checkpoints.length} checkpoint{mission.checkpoints.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Checkpoints */}
                  {mission.checkpoints.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="space-y-1">
                        {mission.checkpoints.map((checkpoint) => (
                          <div
                            key={checkpoint.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className="w-4 h-4 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                style={{ color: 'var(--color-priority-low)' }}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span style={{ color: 'var(--color-text-secondary)' }}>
                                {checkpoint.title}
                              </span>
                            </div>
                            <span
                              className="text-xs"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              {checkpoint.timeSpent ? formatDuration(checkpoint.timeSpent) : formatDuration(checkpoint.duration)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
