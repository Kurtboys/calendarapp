import { useDayStart } from '../../context/DayStartContext';

export function SettingsView() {
  const { userSettings, updateSettings } = useDayStart();

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM (Midnight)';
    if (hour === 12) return '12 PM (Noon)';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  return (
    <div
      className="h-full overflow-auto p-6"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Settings
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Customize your Focus experience
          </p>
        </div>

        {/* Settings sections */}
        <div className="space-y-6">
          {/* Default End Time */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Default End Time
            </h2>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              When you login for the day, your work session will end at this time by default.
              You can always adjust it for individual days.
            </p>
            <select
              value={userSettings.defaultEndTime}
              onChange={(e) => updateSettings({ defaultEndTime: Number(e.target.value) })}
              className="w-full px-4 py-3 rounded-lg text-lg"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            >
              {hours.map((hour) => (
                <option key={hour} value={hour}>
                  {formatHour(hour)}
                </option>
              ))}
            </select>
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              The day boundary is fixed at 2 AM. Times after midnight (like 2 AM)
              are treated as "the same day" as the evening before.
            </p>
          </div>

          {/* About section */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              About Focus
            </h2>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Focus is a calendar app designed for people with ADHD and irregular sleep schedules.
              It helps you manage your time with missions and checkpoints,
              with a day that resets at 2 AM instead of midnight.
            </p>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--color-background)' }}
            >
              <h3
                className="text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Key Features
              </h3>
              <ul
                className="text-sm space-y-1"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <li>• 2 AM day boundary (perfect for night owls)</li>
                <li>• Missions with checkpoints to break down work</li>
                <li>• Missions list for future planning</li>
                <li>• Bottleneck tracking for blocked work</li>
                <li>• Simple login/logout to start and end your day</li>
              </ul>
            </div>
          </div>

          {/* Data section */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Your Data
            </h2>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              All your data is stored locally in your browser. Nothing is sent to any server.
            </p>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--color-priority-urgent)',
                color: 'white',
              }}
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
