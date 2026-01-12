import { useDayStart } from '../context/DayStartContext';
import { formatDuration } from '../utils/date';

export function HomePage() {
  const { startLoginFlow, getBriefingData, missionsList } = useDayStart();
  const { todayMissions, totalCheckpoints, carriedOver } = getBriefingData();

  const allMissions = [...carriedOver, ...todayMissions];
  const hasMissions = allMissions.length > 0;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <h1
          className="text-2xl font-bold text-center mb-6"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Welcome Back
        </h1>

        {/* Briefing Section */}
        <div className="mb-8">
          <h2
            className="text-sm font-medium uppercase tracking-wide mb-4"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Today's Briefing
          </h2>

          {hasMissions ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div
                className="p-4 rounded-xl"
                style={{ backgroundColor: 'var(--color-background)' }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Missions
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {allMissions.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--color-text-secondary)' }}>
                    Total Checkpoints
                  </span>
                  <span
                    className="text-lg font-bold"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {totalCheckpoints + carriedOver.reduce((sum, m) => sum + m.checkpoints.length, 0)}
                  </span>
                </div>
              </div>

              {/* Carried Over Section */}
              {carriedOver.length > 0 && (
                <div>
                  <p
                    className="text-xs font-medium uppercase mb-2"
                    style={{ color: 'var(--color-priority-high)' }}
                  >
                    Carried Over ({carriedOver.length})
                  </p>
                  <div className="space-y-2">
                    {carriedOver.map((mission) => (
                      <div
                        key={mission.id}
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-background)',
                          borderLeft: '3px solid var(--color-priority-high)',
                        }}
                      >
                        <p
                          className="font-medium text-sm"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {mission.title}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {mission.checkpoints.length} checkpoint{mission.checkpoints.length !== 1 ? 's' : ''} &middot; {formatDuration(mission.duration)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled Missions */}
              {todayMissions.length > 0 && (
                <div>
                  <p
                    className="text-xs font-medium uppercase mb-2"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Scheduled ({todayMissions.length})
                  </p>
                  <div className="space-y-2">
                    {todayMissions.map((mission) => (
                      <div
                        key={mission.id}
                        className="p-3 rounded-lg"
                        style={{
                          backgroundColor: 'var(--color-background)',
                          borderLeft: '3px solid var(--color-accent)',
                        }}
                      >
                        <p
                          className="font-medium text-sm"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {mission.title}
                        </p>
                        <p
                          className="text-xs mt-1"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {mission.checkpoints.length} checkpoint{mission.checkpoints.length !== 1 ? 's' : ''} &middot; {formatDuration(mission.duration)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="p-6 rounded-xl text-center"
              style={{ backgroundColor: 'var(--color-background)' }}
            >
              <p
                className="text-lg mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                No missions scheduled
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                {missionsList.length > 0
                  ? `You have ${missionsList.length} mission${missionsList.length !== 1 ? 's' : ''} in your list`
                  : 'Start your day and add some missions'}
              </p>
            </div>
          )}
        </div>

        {/* Login Button */}
        <button
          onClick={startLoginFlow}
          className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: 'white',
          }}
        >
          Login for the Day
        </button>
      </div>
    </div>
  );
}
