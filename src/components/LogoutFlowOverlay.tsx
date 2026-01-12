import { useState } from 'react';
import { useDayStart } from '../context/DayStartContext';
import type { MissionCategory } from '../types';
import { formatDuration } from '../utils/date';

export function LogoutFlowOverlay() {
  const {
    logoutFlow,
    handleUnfinishedMission,
    skipPlanTomorrow,
    finishLogout,
    getTomorrowDate,
  } = useDayStart();

  const [selectedCategory, setSelectedCategory] = useState<MissionCategory | null>(null);

  if (!logoutFlow) return null;

  // Handle unfinished missions step
  if (logoutFlow.step === 'unfinished-missions' && logoutFlow.unfinishedMissions.length > 0) {
    const currentMission = logoutFlow.unfinishedMissions[logoutFlow.currentIndex];
    const remaining = logoutFlow.unfinishedMissions.length - logoutFlow.currentIndex;

    const handleMoveToTomorrow = () => {
      handleUnfinishedMission(currentMission.id, 'tomorrow');
      setSelectedCategory(null);
    };

    const handleMoveToList = () => {
      if (!selectedCategory) return;
      handleUnfinishedMission(currentMission.id, 'missions-list', selectedCategory);
      setSelectedCategory(null);
    };

    const categoryLabels: Record<MissionCategory, string> = {
      'need-to-do-soon': 'Need to do soon',
      'can-wait': 'Can wait',
      'sometime-future': 'Sometime in the future',
    };

    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-6 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          {/* Header */}
          <div className="mb-6">
            <p
              className="text-xs font-medium uppercase tracking-wide mb-1"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Unfinished Mission ({remaining} remaining)
            </p>
            <h2
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              What about this mission?
            </h2>
          </div>

          {/* Mission Card */}
          <div
            className="p-4 rounded-xl mb-6"
            style={{
              backgroundColor: 'var(--color-background)',
              border: '1px solid var(--color-border)',
            }}
          >
            <p
              className="font-semibold text-lg mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {currentMission.title}
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {currentMission.checkpoints.length} checkpoint{currentMission.checkpoints.length !== 1 ? 's' : ''} &middot; {formatDuration(currentMission.duration)}
            </p>
            {currentMission.checkpoints.filter(cp => cp.completed).length > 0 && (
              <p
                className="text-sm mt-1"
                style={{ color: 'var(--color-accent)' }}
              >
                {currentMission.checkpoints.filter(cp => cp.completed).length} of {currentMission.checkpoints.length} checkpoints completed
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-4">
            {/* Move to Tomorrow */}
            <button
              onClick={handleMoveToTomorrow}
              className="w-full py-3 px-4 rounded-xl font-medium text-left transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
              }}
            >
              Move to Tomorrow ({getTomorrowDate()})
            </button>

            {/* Move to Missions List */}
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: 'var(--color-background)',
                border: '1px solid var(--color-border)',
              }}
            >
              <p
                className="font-medium mb-3"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Move to Missions List
              </p>
              <p
                className="text-sm mb-3"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Select a category:
              </p>
              <div className="space-y-2 mb-3">
                {(Object.keys(categoryLabels) as MissionCategory[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className="w-full py-2 px-3 rounded-lg text-left text-sm transition-all"
                    style={{
                      backgroundColor: selectedCategory === cat ? 'var(--color-accent-light)' : 'var(--color-surface)',
                      border: `1px solid ${selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      color: selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    }}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>
              <button
                onClick={handleMoveToList}
                disabled={!selectedCategory}
                className="w-full py-2 px-4 rounded-lg font-medium transition-all"
                style={{
                  backgroundColor: selectedCategory ? 'var(--color-text-primary)' : 'var(--color-border)',
                  color: selectedCategory ? 'var(--color-surface)' : 'var(--color-text-tertiary)',
                  cursor: selectedCategory ? 'pointer' : 'not-allowed',
                }}
              >
                Add to List
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Plan tomorrow step
  if (logoutFlow.step === 'plan-tomorrow') {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center p-6 z-50"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      >
        <div
          className="w-full max-w-md rounded-2xl p-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Plan Tomorrow?
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Would you like to schedule missions for {getTomorrowDate()}?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                // This will be handled by App.tsx to show Scheduler with tomorrow selected
                finishLogout();
                // The navigation to scheduler with tomorrow will be handled after logout
              }}
              className="w-full py-3 px-4 rounded-xl font-medium transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
              }}
            >
              Yes, plan tomorrow
            </button>
            <button
              onClick={skipPlanTomorrow}
              className="w-full py-3 px-4 rounded-xl font-medium transition-all"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              No, just log out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
