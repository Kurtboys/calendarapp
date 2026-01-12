import { useState } from 'react';
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
    startMission,
    getCurrentMission,
    getAssignedMissions,
    getUnassignedMissions,
    addCheckpoint,
    deleteCheckpoint,
  } = useDayStart();

  const [expandedTimelineMissionId, setExpandedTimelineMissionId] = useState<string | null>(null);
  const [timelineCheckpointTitle, setTimelineCheckpointTitle] = useState('');
  const [timelineCheckpointDuration, setTimelineCheckpointDuration] = useState(15);

  const effectiveDate = getEffectiveDate();
  const isToday = date.toDateString() === effectiveDate.toDateString();

  const assignedMissions = getAssignedMissions();
  const unassignedMissions = getUnassignedMissions();
  const currentMission = getCurrentMission();

  const productiveHours = dayConfig ? getProductiveHours(dayConfig.startTime, dayConfig.endTime) : [];
  const hourHeight = 80; // pixels per hour

  const handleAddTimelineCheckpoint = (missionId: string) => {
    if (!timelineCheckpointTitle.trim()) return;
    addCheckpoint(missionId, timelineCheckpointTitle.trim(), timelineCheckpointDuration);
    setTimelineCheckpointTitle('');
    setTimelineCheckpointDuration(15);
  };

  const handleTimelineCheckpointKeyDown = (e: React.KeyboardEvent, missionId: string) => {
    if (e.key === 'Enter') {
      handleAddTimelineCheckpoint(missionId);
    }
  };

  // Calculate mission block positions on timeline based on Parkinson's Law
  const getMissionBlockStyle = (missionIndex: number) => {
    let topMinutes = 0;
    let extraHeight = 0;
    for (let i = 0; i < missionIndex; i++) {
      topMinutes += assignedMissions[i].duration;
      if (assignedMissions[i].id === expandedTimelineMissionId) {
        extraHeight += 200;
      }
    }
    const mission = assignedMissions[missionIndex];
    const topPixels = (topMinutes / 60) * hourHeight + extraHeight;
    const heightPixels = (mission.duration / 60) * hourHeight;
    const isExpanded = mission.id === expandedTimelineMissionId;
    const expandedExtra = isExpanded ? 200 : 0;
    return { top: topPixels, height: Math.max(heightPixels, 60) + expandedExtra };
  };

  // Check if mission details should be visible
  const isMissionVisible = (missionId: string) => {
    return currentMission?.id === missionId || expandedTimelineMissionId === missionId;
  };

  // Get mission state for visual indicators
  const getMissionState = (mission: typeof assignedMissions[0]) => {
    if (mission.checkpoints.length === 0) {
      return 'needs-setup';
    }
    return 'ready';
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
        {/* Left Sidebar - Mission summary (view only) */}
        <div
          className="w-72 flex-shrink-0 border-r overflow-auto"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div className="p-4">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Today's Missions
            </h2>

            {/* Assigned missions summary */}
            {assignedMissions.length > 0 && (
              <div className="mb-6">
                <h3
                  className="text-xs font-medium mb-2"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Scheduled ({assignedMissions.length})
                </h3>
                <div className="space-y-2">
                  {assignedMissions.map((mission) => (
                    <div
                      key={mission.id}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: mission.id === currentMission?.id
                          ? 'var(--color-accent-light)'
                          : 'var(--color-background)',
                        border: `1px solid ${mission.id === currentMission?.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
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
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-tertiary)',
                          }}
                        >
                          {formatDuration(mission.duration)}
                        </span>
                      </div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {mission.title}
                      </p>
                      {mission.checkpoints.length > 0 && (
                        <p
                          className="text-xs mt-1"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {mission.checkpoints.length} checkpoint{mission.checkpoints.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unassigned missions */}
            {unassignedMissions.length > 0 && (
              <div>
                <h3
                  className="text-xs font-medium mb-2"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Unscheduled ({unassignedMissions.length})
                </h3>
                <div className="space-y-2">
                  {unassignedMissions.map((mission) => (
                    <div
                      key={mission.id}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: 'var(--color-background)',
                        border: '1px solid var(--color-border)',
                        opacity: 0.7,
                      }}
                    >
                      <p
                        className="text-sm"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {mission.title}
                      </p>
                      <p
                        className="text-xs mt-1"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {formatDuration(mission.duration)} - Not scheduled
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assignedMissions.length === 0 && unassignedMissions.length === 0 && (
              <div className="text-center py-8">
                <p style={{ color: 'var(--color-text-tertiary)' }}>
                  No missions yet
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  Go to Scheduler to add missions
                </p>
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
                  <div
                    className="w-20 flex-shrink-0 px-3 py-2 text-xs font-medium"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {formatHour(hour)}
                  </div>
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
                  const isExpanded = expandedTimelineMissionId === mission.id;
                  const missionState = getMissionState(mission);

                  const getBorderColor = () => {
                    if (isCurrent && isExpanded) return 'var(--color-accent)';
                    if (missionState === 'needs-setup') return 'var(--color-priority-high)';
                    return 'var(--color-priority-low)';
                  };

                  return (
                    <div
                      key={mission.id}
                      className={`absolute left-0 right-0 rounded-lg p-3 transition-all cursor-pointer hover:scale-[1.005]`}
                      style={{
                        top: style.top + 4,
                        height: style.height - 8,
                        backgroundColor: 'var(--color-surface)',
                        border: `2px solid ${getBorderColor()}`,
                        opacity: isVisible ? 1 : 0.6,
                      }}
                      onClick={() => {
                        if (isCurrent) {
                          setExpandedTimelineMissionId(isExpanded ? null : mission.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: 'var(--color-accent-light)',
                                color: 'var(--color-accent)',
                              }}
                            >
                              Mission {mission.missionNumber}
                            </span>
                            {isCurrent && (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: missionState === 'needs-setup'
                                    ? 'var(--color-priority-high)'
                                    : 'var(--color-priority-low)',
                                  color: 'white',
                                }}
                              >
                                {missionState === 'needs-setup' ? 'Needs Setup' : 'Ready'}
                              </span>
                            )}
                          </div>

                          {isVisible ? (
                            <>
                              <p
                                className="font-medium truncate"
                                style={{ color: 'var(--color-text-primary)' }}
                              >
                                {mission.title}
                              </p>
                              {!isExpanded && mission.checkpoints.length > 0 && (
                                <p
                                  className="text-xs mt-1"
                                  style={{ color: 'var(--color-text-tertiary)' }}
                                >
                                  {mission.checkpoints.length} checkpoint{mission.checkpoints.length !== 1 ? 's' : ''}
                                </p>
                              )}
                              {isCurrent && !isExpanded && (
                                <p
                                  className="text-xs mt-1"
                                  style={{ color: 'var(--color-accent)' }}
                                >
                                  Click to set up checkpoints
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

                        <div
                          className="text-xs font-medium px-2 py-1 rounded ml-2"
                          style={{
                            backgroundColor: 'var(--color-background)',
                            color: 'var(--color-text-secondary)',
                          }}
                        >
                          {formatDuration(mission.duration)}
                        </div>
                      </div>

                      {/* Expanded: Checkpoint list + add form + Start button */}
                      {isExpanded && isCurrent && (
                        <div
                          className="mt-3 pt-3 border-t"
                          style={{ borderColor: 'var(--color-border)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {mission.checkpoints.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {mission.checkpoints.map((cp, cpIdx) => (
                                <div
                                  key={cp.id}
                                  className="flex items-center gap-2 p-2 rounded"
                                  style={{ backgroundColor: 'var(--color-background)' }}
                                >
                                  <span
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                                    style={{
                                      backgroundColor: 'var(--color-accent-light)',
                                      color: 'var(--color-accent)',
                                    }}
                                  >
                                    {cpIdx + 1}
                                  </span>
                                  <span
                                    className="flex-1 text-sm"
                                    style={{ color: 'var(--color-text-primary)' }}
                                  >
                                    {cp.title}
                                  </span>
                                  <span
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{
                                      backgroundColor: 'var(--color-surface)',
                                      color: 'var(--color-text-tertiary)',
                                    }}
                                  >
                                    {formatDuration(cp.duration)}
                                  </span>
                                  <button
                                    onClick={() => deleteCheckpoint(mission.id, cp.id)}
                                    className="p-1 rounded hover:opacity-70"
                                    style={{ color: 'var(--color-text-tertiary)' }}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add checkpoint form */}
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              value={timelineCheckpointTitle}
                              onChange={(e) => setTimelineCheckpointTitle(e.target.value)}
                              onKeyDown={(e) => handleTimelineCheckpointKeyDown(e, mission.id)}
                              placeholder="Add checkpoint..."
                              className="flex-1 px-3 py-2 rounded-lg text-sm"
                              style={{
                                backgroundColor: 'var(--color-background)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border)',
                              }}
                            />
                            <select
                              value={timelineCheckpointDuration}
                              onChange={(e) => setTimelineCheckpointDuration(Number(e.target.value))}
                              className="px-2 py-2 rounded-lg text-sm"
                              style={{
                                backgroundColor: 'var(--color-background)',
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
                              onClick={() => handleAddTimelineCheckpoint(mission.id)}
                              disabled={!timelineCheckpointTitle.trim()}
                              className="px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                              style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'white',
                              }}
                            >
                              Add
                            </button>
                          </div>

                          {/* Start button */}
                          <button
                            onClick={() => startMission(mission.id)}
                            className="w-full py-3 rounded-xl text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              backgroundColor: 'var(--color-priority-low)',
                              color: 'white',
                            }}
                          >
                            START MISSION
                          </button>
                        </div>
                      )}

                      {/* Checkpoint progress bar */}
                      {!isExpanded && isVisible && mission.checkpoints.length > 0 && (
                        <div className="mt-2 flex gap-1">
                          {mission.checkpoints.map(cp => (
                            <div
                              key={cp.id}
                              className="flex-1 h-1.5 rounded-full"
                              style={{
                                backgroundColor: cp.completed
                                  ? 'var(--color-priority-low)'
                                  : 'var(--color-border)',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}
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
                      Go to Scheduler to add and schedule missions
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
