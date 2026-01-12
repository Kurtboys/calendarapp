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
    startMission,
    getCurrentMission,
    getAssignedMissions,
    getUnassignedMissions,
    assignMissionNumber,
    addCheckpoint,
    deleteCheckpoint,
  } = useDayStart();

  const [expandedTimelineMissionId, setExpandedTimelineMissionId] = useState<string | null>(null);
  const [timelineCheckpointTitle, setTimelineCheckpointTitle] = useState('');
  const [timelineCheckpointDuration, setTimelineCheckpointDuration] = useState(15);
  const [draggedMissionId, setDraggedMissionId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const effectiveDate = getEffectiveDate();
  const isToday = date.toDateString() === effectiveDate.toDateString();

  const assignedMissions = getAssignedMissions();
  const unassignedMissions = getUnassignedMissions();
  const currentMission = getCurrentMission();

  // Combine all missions: assigned first (sorted by number), then unassigned
  const allMissions = [...assignedMissions, ...unassignedMissions];

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

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, missionId: string) => {
    setDraggedMissionId(missionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', missionId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedMissionId) return;

    // Find the dragged mission
    const draggedMission = allMissions.find(m => m.id === draggedMissionId);
    if (!draggedMission) return;

    // Reorder: assign sequential numbers based on new position
    // First, create new order array
    const reorderedMissions = allMissions.filter(m => m.id !== draggedMissionId);
    reorderedMissions.splice(targetIndex, 0, draggedMission);

    // Assign new mission numbers (1-based, sequential)
    reorderedMissions.forEach((mission, idx) => {
      const newNumber = idx + 1;
      if (mission.missionNumber !== newNumber) {
        assignMissionNumber(mission.id, newNumber);
      }
    });

    setDraggedMissionId(null);
  }, [draggedMissionId, allMissions, assignMissionNumber]);

  const handleDragEnd = useCallback(() => {
    setDraggedMissionId(null);
    setDragOverIndex(null);
  }, []);

  // Get available mission numbers (1-15 minus already assigned, but include current mission's number)
  const getAvailableMissionNumbers = useCallback((currentMissionId?: string) => {
    const usedNumbers = assignedMissions
      .filter(m => m.id !== currentMissionId)
      .map(m => m.missionNumber)
      .filter(n => n !== undefined) as number[];
    return Array.from({ length: 15 }, (_, i) => i + 1).filter(n => !usedNumbers.includes(n));
  }, [assignedMissions]);

  // Calculate mission block positions on timeline
  // Each block has a minimum height of 48px + 8px gap between blocks
  const BLOCK_MIN_HEIGHT = 48;
  const BLOCK_GAP = 8;

  const getMissionBlockStyle = (missionIndex: number) => {
    let topPixels = 0;

    // Stack blocks vertically with gaps
    for (let i = 0; i < missionIndex; i++) {
      const prevDurationHeight = (assignedMissions[i].duration / 60) * hourHeight;
      const prevBlockHeight = Math.max(prevDurationHeight, BLOCK_MIN_HEIGHT);
      const prevExpandedExtra = assignedMissions[i].id === expandedTimelineMissionId ? 200 : 0;
      topPixels += prevBlockHeight + prevExpandedExtra + BLOCK_GAP;
    }

    const mission = assignedMissions[missionIndex];
    const durationHeight = (mission.duration / 60) * hourHeight;
    const blockHeight = Math.max(durationHeight, BLOCK_MIN_HEIGHT);
    const isExpanded = mission.id === expandedTimelineMissionId;
    const expandedExtra = isExpanded ? 200 : 0;

    return { top: topPixels, height: blockHeight + expandedExtra };
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
        {/* Left Sidebar - Draggable mission list */}
        <div
          className="w-72 flex-shrink-0 border-r overflow-auto"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
        >
          <div className="p-4">
            <h2
              className="text-sm font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Today's Missions
            </h2>
            <p
              className="text-xs mb-4"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Drag to reorder • Use dropdown to assign order
            </p>

            {/* All missions in one draggable list */}
            {allMissions.length > 0 ? (
              <div className="space-y-2">
                {allMissions.map((mission, index) => {
                  const isScheduled = mission.missionNumber !== undefined;
                  const isDragging = draggedMissionId === mission.id;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <div
                      key={mission.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, mission.id)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                        isDragging ? 'opacity-50 scale-95' : ''
                      }`}
                      style={{
                        backgroundColor: mission.id === currentMission?.id
                          ? 'var(--color-accent-light)'
                          : 'var(--color-background)',
                        border: isDragOver
                          ? '2px dashed var(--color-accent)'
                          : `1px solid ${mission.id === currentMission?.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        transform: isDragOver ? 'translateY(2px)' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {/* Drag handle */}
                        <div
                          className="flex-shrink-0 text-gray-400"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                        </div>

                        {/* Mission number dropdown */}
                        <select
                          value={mission.missionNumber ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            assignMissionNumber(mission.id, val ? Number(val) : undefined);
                          }}
                          className="flex-shrink-0 w-12 h-8 rounded-lg text-xs font-bold text-center cursor-pointer"
                          style={{
                            backgroundColor: isScheduled ? 'var(--color-priority-low)' : 'var(--color-background)',
                            color: isScheduled ? 'white' : 'var(--color-text-tertiary)',
                            border: `1px solid ${isScheduled ? 'var(--color-priority-low)' : 'var(--color-border)'}`,
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            paddingLeft: '0.5rem',
                            paddingRight: '0.5rem',
                          }}
                        >
                          <option value="">—</option>
                          {mission.missionNumber !== undefined && (
                            <option value={mission.missionNumber}>#{mission.missionNumber}</option>
                          )}
                          {getAvailableMissionNumbers(mission.id).map(n => (
                            <option key={n} value={n}>#{n}</option>
                          ))}
                        </select>

                        {/* Mission info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--color-text-primary)' }}
                          >
                            {mission.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-xs"
                              style={{ color: 'var(--color-text-tertiary)' }}
                            >
                              {formatDuration(mission.duration)}
                            </span>
                            {mission.checkpoints.length > 0 && (
                              <span
                                className="text-xs"
                                style={{ color: 'var(--color-text-tertiary)' }}
                              >
                                • {mission.checkpoints.length} cp
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Drop zone at the end */}
                <div
                  onDragOver={(e) => handleDragOver(e, allMissions.length)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, allMissions.length)}
                  className="h-8 rounded-lg transition-colors"
                  style={{
                    backgroundColor: dragOverIndex === allMissions.length ? 'var(--color-accent-light)' : 'transparent',
                    border: dragOverIndex === allMissions.length ? '2px dashed var(--color-accent)' : '2px dashed transparent',
                  }}
                />
              </div>
            ) : (
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
                      className={`absolute left-0 right-0 rounded-lg p-2 transition-all cursor-pointer hover:scale-[1.005]`}
                      style={{
                        top: style.top,
                        height: style.height,
                        backgroundColor: 'var(--color-surface)',
                        border: `2px solid ${getBorderColor()}`,
                        opacity: isVisible ? 1 : 0.6,
                        overflow: 'hidden',
                      }}
                      onClick={() => {
                        if (isCurrent) {
                          setExpandedTimelineMissionId(isExpanded ? null : mission.id);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between gap-2" style={{ flexWrap: 'nowrap' }}>
                        {/* Left: number + title */}
                        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                          <span
                            className="text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{
                              backgroundColor: 'var(--color-accent-light)',
                              color: 'var(--color-accent)',
                            }}
                          >
                            {mission.missionNumber}
                          </span>
                          <span
                            className="text-sm truncate"
                            style={{ color: isVisible ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}
                          >
                            {isVisible ? mission.title : 'Hidden'}
                          </span>
                        </div>

                        {/* Right: status + duration */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {isCurrent && missionState === 'needs-setup' && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: 'var(--color-priority-high)', color: 'white' }}
                            >
                              !
                            </span>
                          )}
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--color-background)',
                              color: 'var(--color-text-secondary)',
                            }}
                          >
                            {formatDuration(mission.duration)}
                          </span>
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
                      Click the number buttons in the sidebar to schedule missions
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
