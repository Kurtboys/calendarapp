import { useState } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { useAI } from '../../context/AIContext';

export function SettingsView() {
  const { userSettings, updateSettings } = useDayStart();
  const { aiSettings, updateAISettings, isApiKeyValid, validateKey, getAccuracyStats, timeHistory } = useAI();
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(aiSettings.apiKey || '');
  const [isValidating, setIsValidating] = useState(false);

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

          {/* AI Breakdown Settings */}
          <div
            className="p-6 rounded-xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Magic Breakdown (AI)
              </h2>
              {isApiKeyValid !== null && (
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: isApiKeyValid ? 'var(--color-priority-low)' : 'var(--color-priority-urgent)',
                    color: 'white',
                  }}
                >
                  {isApiKeyValid ? 'Connected' : 'Invalid Key'}
                </span>
              )}
            </div>
            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Use AI to automatically break down tasks into checkpoints with smart time estimates.
              Requires an Anthropic API key.
            </p>

            {/* API Key Input */}
            <div className="mb-4">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Anthropic API Key
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-3 rounded-lg pr-10"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      border: '1px solid var(--color-border)',
                    }}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {showApiKey ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <button
                  onClick={async () => {
                    setIsValidating(true);
                    updateAISettings({ apiKey: tempApiKey, enabled: true });
                    await validateKey();
                    setIsValidating(false);
                  }}
                  disabled={isValidating || !tempApiKey}
                  className="px-4 py-3 rounded-lg font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                  }}
                >
                  {isValidating ? 'Checking...' : 'Save'}
                </button>
              </div>
              <p
                className="text-xs mt-2"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Your API key is stored locally and never sent anywhere except Anthropic.
                Get one at{' '}
                <a
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--color-accent)' }}
                >
                  console.anthropic.com
                </a>
              </p>
            </div>

            {/* Time Learning Stats */}
            {timeHistory.length > 0 && (
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'var(--color-background)' }}
              >
                <h3
                  className="text-sm font-medium mb-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Time Estimation Learning
                </h3>
                <p
                  className="text-sm mb-2"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Based on {timeHistory.length} completed tasks, the AI learns how you work.
                </p>
                {(() => {
                  const stats = getAccuracyStats();
                  const accuracyPercent = Math.round(stats.overall * 100);
                  const isFaster = stats.overall < 1;
                  return (
                    <div className="flex items-center gap-2">
                      <span
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        {accuracyPercent}%
                      </span>
                      <span
                        className="text-sm"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {isFaster
                          ? `You complete tasks ${Math.round((1 - stats.overall) * 100)}% faster than estimated`
                          : `You take ${Math.round((stats.overall - 1) * 100)}% longer than estimated`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}
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
