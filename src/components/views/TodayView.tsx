import { useState, useCallback } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { ActiveMissionModal } from '../ActiveMissionModal';
import { formatDuration, getEffectiveDate, getDayName, getMonthName } from '../../utils/date';

interface TodayViewProps {
  date: Date;
}

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// Get hours array for the productive window
function getProductiveHours(startTime: number, endTime: number): number[] {
  const hours: number[] = [];
  if (endTime > startTime) {
    // Same day: e.g., 9 AM to 5 PM
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

export function TodayView({ date }: TodayViewProps) {
  const {
    dayConfig,
    activeMission,
    addMission,
    addCheckpoint,
    deleteMission,
    deleteCheckpoint,
    assignMissionNumber,
    startMission,
    getCurrentMission,
    getCurrentCheckpoint,
    getAssignedMissions,
    getUnassignedMissions,
  } = useDayStart();

  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDuration, setNewMissionDuration] = useState(30);
  const [newCheckpointTitle, setNewCheckpointTitle] = useState('');
  const [newCheckpointDuration, setNewCheckpointDuration] = useState(15);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [showCompletedList, setShowCompletedList] = useState(false);

  const effectiveDate = getEffectiveDate();
  const isToday = date.toDateString() === effectiveDate.toDateString();

  const assignedMissions = getAssignedMissions();
  const unassignedMissions = getUnassignedMissions();
  const currentMission = getCurrentMission();
  const currentCheckpoint = getCurrentCheckpoint();
  const allMissions = dayConfig?.missions || [];
  const completedMissions = allMissions.filter(m => m.completed).sort((a, b) => {
    if (a.completedAt && b.completedAt) {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    }
    return 0;
  });

  const productiveHours = dayConfig ? getProductiveHours(dayConfig.startTime, dayConfig.endTime) : [];
  const hourHeight = 80; // pixels per hour

  const handleAddMission = useCallback(() => {
    if (!newMissionTitle.trim()) return;
    addMission(newMissionTitle.trim(), newMissionDuration);
    setNewMissionTitle('');
    setNewMissionDuration(30);
  }, [newMissionTitle, newMissionDuration, addMission]);

  const handleAddCheckpoint = useCallback((missionId: string) => {
    if (!newCheckpointTitle.trim()) return;
    addCheckpoint(missionId, newCheckpointTitle.trim(), newCheckpointDuration);
    setNewCheckpointTitle('');
    setNewCheckpointDuration(15);
  }, [newCheckpointTitle, newCheckpointDuration, addCheckpoint]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddMission();
    }
  };

  const handleCheckpointKeyDown = (e: React.KeyboardEvent, missionId: string) => {
    if (e.key === 'Enter') {
      handleAddCheckpoint(missionId);
    }
  };

  // Calculate mission block positions on timeline based on Parkinson's Law
  const getMissionBlockStyle = (missionIndex: number) => {
    let topMinutes = 0;
    for (let i = 0; i < missionIndex; i++) {
      topMinutes += assignedMissions[i].duration;
    }
    const mission = assignedMissions[missionIndex];
    const topPixels = (topMinutes / 60) * hourHeight;
    const heightPixels = (mission.duration / 60) * hourHeight;
    return { top: topPixels, height: Math.max(heightPixels, 40) }; // minimum 40px height
  };

  // Check if mission details should be visible (only current mission)
  const isMissionVisible = (missionId: string) => {
    return currentMission?.id === missionId;
  };

  // Get available mission numbers (1-15 minus already assigned)
  const getAvailableMissionNumbers = () => {
    const usedNumbers = assignedMissions.map(m => m.missionNumber).filter(n => n !== undefined);
    return Array.from({ length: 15 }, (_, i) => i + 1).filter(n => !usedNumbers.includes(n));
  };

  if (!isToday) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {getDayName(date)}, {getMonthName(date)} {date.getDate()}
          </p>
          <p className="mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Missions are only shown for today
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {activeMission && <ActiveMissionModal />}

      <div className="h-full flex">
        {/* Left Sidebar - Unassigned Missions */}
        <div
          className="w-72 flex-shrink-0 border-r overflow-auto"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div className="p-4">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Missions
            </h2>

            {/* Add new mission */}
            <div className="mb-4">
              <input
                type="text"
                value={newMissionTitle}
                onChange={(e) => setNewMissionTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="New mission..."
                className="w-full px-3 py-2 rounded-lg text-sm mb-2"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <div className="flex gap-2">
                <select
                  value={newMissionDuration}
                  onChange={(e) => setNewMissionDuration(Number(e.target.value))}
                  className="flex-1 px-2 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <option value={15}>15m</option>
                  <option value={30}>30m</option>
                  <option value={45}>45m</option>
                  <option value={60}>1h</option>
                  <option value={90}>1.5h</option>
                  <option value={120}>2h</option>
                  <option value={180}>3h</option>
                  <option value={240}>4h</option>
                </select>
                <button
                  onClick={handleAddMission}
                  disabled={!newMissionTitle.trim()}
                  className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Unassigned missions list */}
            <div className="space-y-2">
              {unassignedMissions.length === 0 ? (
                <p className="text-sm py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                  No unassigned missions
                </p>
              ) : (
                unassignedMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p
                        className="text-sm font-medium flex-1"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {mission.title}
                      </p>
                      <button
                        onClick={() => deleteMission(mission.id)}
                        className="p-1 rounded hover:opacity-70"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: 'var(--color-accent-light)',
                          color: 'var(--color-accent)',
                        }}
                      >
                        {formatDuration(mission.duration)}
                      </span>
                      <select
                        value=""
                        onChange={(e) => {
                          const num = Number(e.target.value);
                          if (num) assignMissionNumber(mission.id, num);
                        }}
                        className="flex-1 px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--color-surface)',
                          color: 'var(--color-text-primary)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        <option value="">Assign #...</option>
                        {getAvailableMissionNumbers().map(n => (
                          <option key={n} value={n}>Mission {n}</option>
                        ))}
                      </select>
                    </div>
                    {/* Expand to add checkpoints */}
                    <button
                      onClick={() => setExpandedMissionId(expandedMissionId === mission.id ? null : mission.id)}
                      className="mt-2 text-xs w-full text-left"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      {expandedMissionId === mission.id ? '- Hide checkpoints' : '+ Add checkpoints'}
                    </button>
                    {expandedMissionId === mission.id && (
                      <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                        {mission.checkpoints.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {mission.checkpoints.map((cp, idx) => (
                              <div key={cp.id} className="flex items-center gap-2 text-xs">
                                <span style={{ color: 'var(--color-text-tertiary)' }}>{idx + 1}.</span>
                                <span className="flex-1" style={{ color: 'var(--color-text-secondary)' }}>{cp.title}</span>
                                <span style={{ color: 'var(--color-text-tertiary)' }}>{formatDuration(cp.duration)}</span>
                                <button
                                  onClick={() => deleteCheckpoint(mission.id, cp.id)}
                                  className="p-0.5 hover:opacity-70"
                                  style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={newCheckpointTitle}
                            onChange={(e) => setNewCheckpointTitle(e.target.value)}
                            onKeyDown={(e) => handleCheckpointKeyDown(e, mission.id)}
                            placeholder="Checkpoint..."
                            className="flex-1 px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border)',
                            }}
                          />
                          <select
                            value={newCheckpointDuration}
                            onChange={(e) => setNewCheckpointDuration(Number(e.target.value))}
                            className="px-1 py-1 rounded text-xs"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <option value={5}>5m</option>
                            <option value={10}>10m</option>
                            <option value={15}>15m</option>
                            <option value={30}>30m</option>
                            <option value={45}>45m</option>
                            <option value={60}>1h</option>
                          </select>
                          <button
                            onClick={() => handleAddCheckpoint(mission.id)}
                            disabled={!newCheckpointTitle.trim()}
                            className="px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
                            style={{
                              backgroundColor: 'var(--color-accent)',
                              color: 'white',
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Completed missions (collapsible) */}
            {completedMissions.length > 0 && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCompletedList(!showCompletedList)}
                  className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  <span>Completed ({completedMissions.length})</span>
                  <svg
                    className={`w-3 h-3 transition-transform ${showCompletedList ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showCompletedList && (
                  <div className="space-y-1">
                    {completedMissions.map(m => (
                      <div
                        key={m.id}
                        className="flex items-center gap-2 p-2 rounded text-xs"
                        style={{ backgroundColor: 'var(--color-background)' }}
                      >
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="var(--color-priority-low)">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="flex-1 line-through" style={{ color: 'var(--color-text-tertiary)' }}>
                          {m.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Main Timeline Area */}
        <div className="flex-1 overflow-auto">
          {dayConfig && (
            <div className="relative" style={{ minHeight: productiveHours.length * hourHeight }}>
              {/* Hour lines */}
              {productiveHours.map((hour, idx) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t flex"
                  style={{
                    top: idx * hourHeight,
                    height: hourHeight,
                    borderColor: 'var(--color-border)',
                  }}
                >
                  {/* Hour label */}
                  <div
                    className="w-20 flex-shrink-0 px-3 py-2 text-xs font-medium"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {formatHour(hour)}
                  </div>
                  {/* Hour cell */}
                  <div
                    className="flex-1 border-l"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                </div>
              ))}

              {/* Mission blocks on timeline */}
              <div className="absolute left-20 right-4 top-0">
                {assignedMissions.map((mission, idx) => {
                  const style = getMissionBlockStyle(idx);
                  const isVisible = isMissionVisible(mission.id);
                  const isCurrent = currentMission?.id === mission.id;

                  return (
                    <div
                      key={mission.id}
                      className={`absolute left-0 right-0 rounded-lg p-3 transition-all ${isCurrent ? 'cursor-pointer hover:scale-[1.01]' : ''}`}
                      style={{
                        top: style.top + 4,
                        height: style.height - 8,
                        backgroundColor: isCurrent ? 'var(--color-accent)' : 'var(--color-surface)',
                        border: `2px solid ${isCurrent ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        opacity: isVisible ? 1 : 0.6,
                      }}
                      onClick={() => isCurrent && startMission(mission.id)}
                    >
                      <div className="flex items-start justify-between h-full">
                        <div className="flex-1 min-w-0">
                          {/* Mission number badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: isCurrent ? 'rgba(255,255,255,0.2)' : 'var(--color-accent-light)',
                                color: isCurrent ? 'white' : 'var(--color-accent)',
                              }}
                            >
                              Mission {mission.missionNumber}
                            </span>
                            {!isCurrent && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  assignMissionNumber(mission.id, undefined);
                                }}
                                className="text-xs px-1 hover:opacity-70"
                                style={{ color: 'var(--color-text-tertiary)' }}
                              >
                                Remove
                              </button>
                            )}
                          </div>

                          {/* Title - only visible for current mission */}
                          {isVisible ? (
                            <>
                              <p
                                className="font-medium truncate"
                                style={{ color: isCurrent ? 'white' : 'var(--color-text-primary)' }}
                              >
                                {mission.title}
                              </p>
                              {mission.checkpoints.length > 0 && currentCheckpoint && (
                                <p
                                  className="text-xs mt-1 truncate"
                                  style={{ color: isCurrent ? 'rgba(255,255,255,0.8)' : 'var(--color-text-tertiary)' }}
                                >
                                  Next: {currentCheckpoint.title}
                                </p>
                              )}
                              {isCurrent && (
                                <p
                                  className="text-xs mt-1"
                                  style={{ color: 'rgba(255,255,255,0.8)' }}
                                >
                                  Click to start
                                </p>
                              )}
                            </>
                          ) : (
                            <p
                              className="text-sm italic"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              Details hidden until Mission {(currentMission?.missionNumber || 0)} completes
                            </p>
                          )}
                        </div>

                        {/* Duration */}
                        <div
                          className="text-xs font-medium px-2 py-1 rounded ml-2"
                          style={{
                            backgroundColor: isCurrent ? 'rgba(255,255,255,0.2)' : 'var(--color-background)',
                            color: isCurrent ? 'white' : 'var(--color-text-secondary)',
                          }}
                        >
                          {formatDuration(mission.duration)}
                        </div>
                      </div>

                      {/* Checkpoint progress bar */}
                      {isVisible && mission.checkpoints.length > 0 && (
                        <div className="mt-2 flex gap-1">
                          {mission.checkpoints.map(cp => (
                            <div
                              key={cp.id}
                              className="flex-1 h-1.5 rounded-full"
                              style={{
                                backgroundColor: cp.completed
                                  ? (isCurrent ? 'rgba(255,255,255,0.8)' : 'var(--color-priority-low)')
                                  : (isCurrent ? 'rgba(255,255,255,0.3)' : 'var(--color-border)'),
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Empty state when no assigned missions */}
              {assignedMissions.length === 0 && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ left: 80 }}
                >
                  <div className="text-center p-8">
                    <p
                      className="text-lg font-medium mb-2"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      No missions scheduled
                    </p>
                    <p style={{ color: 'var(--color-text-tertiary)' }}>
                      Add missions in the sidebar and assign them a number to see them on the timeline
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
