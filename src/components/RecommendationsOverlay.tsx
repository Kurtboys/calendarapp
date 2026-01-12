import { useDayStart } from '../context/DayStartContext';
import { ENERGY_STATES, COGNITIVE_LEVELS } from '../types';
import { formatDuration } from '../utils/date';

export function RecommendationsOverlay() {
  const { loginFlow, applyRecommendations, skipRecommendations } = useDayStart();

  if (!loginFlow || loginFlow.step !== 'recommendations' || !loginFlow.recommendations) {
    return null;
  }

  const { energyState, recommendations } = loginFlow;
  const energyInfo = energyState ? ENERGY_STATES[energyState] : null;

  // Check if order actually changed
  const hasChanges = recommendations.some(r => r.originalOrder !== r.recommendedOrder);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            {energyInfo && <span className="text-xl">{energyInfo.icon}</span>}
            <h2
              className="text-xl font-bold"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {hasChanges ? 'Recommended Order' : 'Your Missions'}
            </h2>
          </div>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {hasChanges
              ? `Based on your ${energyInfo?.label.toLowerCase()} energy, here's a suggested order:`
              : 'Your current order looks good for today!'}
          </p>
        </div>

        {/* Mission List with Comparison */}
        <div
          className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2"
          style={{ maxHeight: '50vh' }}
        >
          {recommendations.map((rec, index) => {
            const cognitive = COGNITIVE_LEVELS[rec.mission.cognitiveLevel];
            const orderChanged = rec.originalOrder !== rec.recommendedOrder;

            return (
              <div
                key={rec.missionId}
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-background)',
                  border: `1px solid ${orderChanged ? 'var(--color-accent)' : 'var(--color-border)'}`,
                }}
              >
                {/* Position indicator */}
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: 'white',
                    }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold mb-1 truncate"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {rec.mission.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs mb-2">
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'var(--color-accent-light)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {cognitive.label}
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)' }}>
                        {formatDuration(rec.mission.minimumViableSession)} min
                      </span>
                    </div>
                    <p
                      className="text-sm"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {rec.reason}
                    </p>
                    {orderChanged && (
                      <p
                        className="text-xs mt-2 flex items-center gap-1"
                        style={{ color: 'var(--color-accent)' }}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                        Moved from position {rec.originalOrder + 1}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {hasChanges ? (
            <>
              <button
                onClick={applyRecommendations}
                className="w-full py-3 px-4 rounded-xl font-medium transition-all hover:scale-[1.01]"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'white',
                }}
              >
                Apply Recommendations
              </button>
              <button
                onClick={skipRecommendations}
                className="w-full py-3 px-4 rounded-xl font-medium transition-all"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Keep Original Order
              </button>
            </>
          ) : (
            <button
              onClick={skipRecommendations}
              className="w-full py-3 px-4 rounded-xl font-medium transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
              }}
            >
              Start My Day
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
