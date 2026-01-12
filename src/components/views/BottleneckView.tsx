import { useDayStart } from '../../context/DayStartContext';
import { formatDuration } from '../../utils/date';

export function BottleneckView() {
  const { bottleneckedMissions, resolveBottleneck } = useDayStart();

  if (bottleneckedMissions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="var(--color-priority-low)">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p
            className="text-lg font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No bottlenecks
          </p>
          <p
            className="mt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            All your missions are flowing smoothly
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Bottlenecked Missions
          </h2>
          <p
            className="mt-1"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Missions waiting on external factors. Check daily to see if you can unblock them.
          </p>
        </div>

        <div className="space-y-4">
          {bottleneckedMissions.map((mission) => (
            <div
              key={mission.id}
              className="p-6 rounded-xl"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '2px solid var(--color-priority-high)',
              }}
            >
              {/* Mission header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3
                    className="text-lg font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {mission.title}
                  </h3>
                  <p
                    className="text-sm mt-1"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {formatDuration(mission.duration)} total • {mission.checkpoints.length} checkpoints
                  </p>
                </div>
                <div
                  className="px-3 py-1 rounded-lg text-xs font-medium"
                  style={{
                    backgroundColor: 'var(--color-priority-high)',
                    color: 'white',
                  }}
                >
                  Blocked
                </div>
              </div>

              {/* Bottleneck reason */}
              <div
                className="p-4 rounded-lg mb-4"
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <p
                  className="text-xs uppercase tracking-wider mb-1"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Blocked by
                </p>
                <p style={{ color: 'var(--color-text-primary)' }}>
                  {mission.bottleneckReason || 'Unknown reason'}
                </p>
                {mission.bottleneckDate && (
                  <p
                    className="text-xs mt-2"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Since {new Date(mission.bottleneckDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Checkpoint progress */}
              {mission.checkpoints.length > 0 && (
                <div className="mb-4">
                  <p
                    className="text-xs uppercase tracking-wider mb-2"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Progress: {mission.checkpoints.filter(cp => cp.completed).length}/{mission.checkpoints.length} checkpoints
                  </p>
                  <div className="flex gap-1">
                    {mission.checkpoints.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex-1 h-2 rounded-full"
                        style={{
                          backgroundColor: cp.completed
                            ? 'var(--color-priority-low)'
                            : 'var(--color-border)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => resolveBottleneck(mission.id)}
                  className="flex-1 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                  style={{
                    backgroundColor: 'var(--color-priority-low)',
                    color: 'white',
                  }}
                >
                  Unblock & Resume
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
