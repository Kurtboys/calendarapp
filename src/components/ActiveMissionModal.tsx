import { useState, useEffect } from 'react';
import { useDayStart } from '../context/DayStartContext';
import { formatDuration } from '../utils/date';
import { BottleneckModal } from './BottleneckModal';

export function ActiveMissionModal() {
  const {
    dayConfig,
    activeMission,
    completeCurrentCheckpoint,
    completeMission,
    cancelActiveMission,
    updateTimeCap,
  } = useDayStart();

  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showBottleneckModal, setShowBottleneckModal] = useState(false);

  const mission = dayConfig?.missions.find(m => m.id === activeMission?.missionId);
  const currentCheckpoint = activeMission?.checkpointId
    ? mission?.checkpoints.find(cp => cp.id === activeMission.checkpointId)
    : null;

  // Update timer
  useEffect(() => {
    if (!activeMission) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - activeMission.startedAt) / 1000);
      const remaining = Math.max(0, activeMission.timeCap * 60 - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeMission]);

  if (!activeMission || !mission) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const progress = activeMission.timeCap > 0
    ? Math.max(0, Math.min(100, (timeRemaining / (activeMission.timeCap * 60)) * 100))
    : 0;

  const completedCheckpoints = mission.checkpoints.filter(cp => cp.completed).length;
  const totalCheckpoints = mission.checkpoints.length;
  const hasCheckpoints = totalCheckpoints > 0;
  const allCheckpointsDone = hasCheckpoints && completedCheckpoints === totalCheckpoints;
  const isLastCheckpoint = hasCheckpoints && completedCheckpoints === totalCheckpoints - 1 && currentCheckpoint;

  const handleComplete = () => {
    if (hasCheckpoints && currentCheckpoint) {
      // Complete the current checkpoint (this will auto-advance or complete mission)
      completeCurrentCheckpoint();
    } else {
      // No checkpoints, just complete the mission
      completeMission();
    }
  };

  const adjustTime = (delta: number) => {
    const newTime = Math.max(1, activeMission.timeCap + delta);
    updateTimeCap(newTime);
  };

  // Circular progress indicator
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--color-background)' }}
      >
        {/* Cancel button */}
        <button
          onClick={cancelActiveMission}
          className="absolute top-6 right-6 p-2 rounded-full transition-colors hover:opacity-70"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Mission title */}
        <div className="text-center mb-2">
          <p className="text-sm uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
            Current Mission
          </p>
          <h1
            className="text-2xl font-bold mt-1"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {mission.title}
          </h1>
        </div>

        {/* Checkpoint info (if applicable) */}
        {hasCheckpoints && (
          <div className="text-center mb-8">
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
              Checkpoint {completedCheckpoints + 1} of {totalCheckpoints}
            </p>
            {currentCheckpoint && (
              <p
                className="text-lg font-medium mt-1"
                style={{ color: 'var(--color-accent)' }}
              >
                {currentCheckpoint.title}
              </p>
            )}
          </div>
        )}

        {/* Timer circle */}
        <div className="relative mb-8">
          <svg className="w-72 h-72 -rotate-90">
            {/* Background circle */}
            <circle
              cx="144"
              cy="144"
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="144"
              cy="144"
              r={radius}
              fill="none"
              stroke={timeRemaining === 0 ? 'var(--color-priority-urgent)' : 'var(--color-accent)'}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-6xl font-bold tabular-nums"
              style={{ color: timeRemaining === 0 ? 'var(--color-priority-urgent)' : 'var(--color-text-primary)' }}
            >
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
            <span className="text-sm mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
              {timeRemaining === 0 ? 'Time cap reached!' : 'remaining'}
            </span>
          </div>
        </div>

        {/* Time adjustment */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => adjustTime(-5)}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            -5 min
          </button>
          <span
            className="text-lg font-medium min-w-[80px] text-center"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {formatDuration(activeMission.timeCap)}
          </span>
          <button
            onClick={() => adjustTime(5)}
            className="px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            +5 min
          </button>
        </div>

        {/* Bottleneck button - always visible */}
        <button
          onClick={() => setShowBottleneckModal(true)}
          className="mb-6 px-6 py-3 rounded-xl font-medium transition-all hover:scale-105"
          style={{
            backgroundColor: 'var(--color-priority-high)',
            color: 'white',
          }}
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Bottleneck
          </span>
        </button>

        {/* Complete button */}
        <button
          onClick={handleComplete}
          disabled={hasCheckpoints && allCheckpointsDone && !currentCheckpoint}
          className="w-full max-w-md py-6 rounded-2xl text-2xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--color-priority-low)',
            color: 'white',
          }}
        >
          {hasCheckpoints
            ? (isLastCheckpoint ? 'COMPLETE MISSION' : 'COMPLETE CHECKPOINT')
            : 'COMPLETE'}
        </button>

        {/* Checkpoint progress dots */}
        {hasCheckpoints && (
          <div className="flex gap-2 mt-6">
            {mission.checkpoints.map((cp, idx) => (
              <div
                key={cp.id}
                className="w-3 h-3 rounded-full transition-all"
                style={{
                  backgroundColor: cp.completed
                    ? 'var(--color-priority-low)'
                    : cp.id === currentCheckpoint?.id
                    ? 'var(--color-accent)'
                    : 'var(--color-border)',
                }}
                title={`${idx + 1}. ${cp.title}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottleneck modal */}
      {showBottleneckModal && (
        <BottleneckModal onClose={() => setShowBottleneckModal(false)} />
      )}
    </>
  );
}
