import { useState, useCallback } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { MissionBlock } from '../MissionBlock';
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

export function TodayView({ date }: TodayViewProps) {
  const {
    dayConfig,
    activeMission,
    addMission,
    addCheckpoint,
    deleteMission,
    deleteCheckpoint,
    reorderMissions,
    toggleMissionRepeating,
    startMission,
    getCurrentMission,
    getCurrentCheckpoint,
  } = useDayStart();

  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDuration, setNewMissionDuration] = useState(30);
  const [newCheckpointTitle, setNewCheckpointTitle] = useState('');
  const [newCheckpointDuration, setNewCheckpointDuration] = useState(15);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showCompletedList, setShowCompletedList] = useState(true);
  const [viewMode, setViewMode] = useState<'timeline' | 'queue'>('queue');
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);

  const effectiveDate = getEffectiveDate();
  const isToday = date.toDateString() === effectiveDate.toDateString();

  const allMissions = dayConfig?.missions || [];
  const pendingMissions = allMissions.filter(m => !m.completed && !m.isBottleneck).sort((a, b) => a.order - b.order);
  const completedMissions = allMissions.filter(m => m.completed).sort((a, b) => {
    if (a.completedAt && b.completedAt) {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    }
    return 0;
  });

  const currentMission = getCurrentMission();
  const currentCheckpoint = getCurrentCheckpoint();

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

  const handleMissionClick = (missionId: string) => {
    startMission(missionId);
  };

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.setData('missionIndex', index.toString());
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newMissions = [...pendingMissions];
      const [draggedMission] = newMissions.splice(dragIndex, 1);
      newMissions.splice(dragOverIndex, 0, draggedMission);
      reorderMissions(newMissions.map(m => m.id));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, pendingMissions, reorderMissions]);

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

      <div className="h-full overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Day info header */}
          {dayConfig && (
            <div
              className="mb-6 p-4 rounded-xl"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    Today's window
                  </p>
                  <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {formatHour(dayConfig.startTime)} – {formatHour(dayConfig.endTime)}
                    {dayConfig.endTime <= dayConfig.startTime && (
                      <span
                        className="ml-1 text-sm font-normal"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        (+1 day)
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    Progress
                  </p>
                  <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {completedMissions.length}/{allMissions.length} missions
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div
                className="mt-3 h-2 rounded-full overflow-hidden"
                style={{ backgroundColor: 'var(--color-border)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: allMissions.length > 0 ? `${(completedMissions.length / allMissions.length) * 100}%` : '0%',
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              </div>
            </div>
          )}

          {/* View mode toggle */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setViewMode('queue')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: viewMode === 'queue' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: viewMode === 'queue' ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              Focus Mode
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: viewMode === 'timeline' ? 'var(--color-accent)' : 'var(--color-surface)',
                color: viewMode === 'timeline' ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              Plan View
            </button>
          </div>

          {/* Queue Mode - Shows only current mission */}
          {viewMode === 'queue' && (
            <div className="mb-8">
              {!currentMission ? (
                <div
                  className="text-center py-12 rounded-xl"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  {completedMissions.length > 0 ? (
                    <>
                      <div
                        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-priority-low)' }}
                      >
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p
                        className="text-xl font-bold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        All missions completed!
                      </p>
                      <p
                        className="mt-2"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        Add more missions or enjoy your day
                      </p>
                    </>
                  ) : (
                    <>
                      <p
                        className="text-lg font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        No missions yet
                      </p>
                      <p
                        className="mt-2"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        Switch to Plan View to add your first mission
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <h3
                    className="text-sm font-semibold uppercase tracking-wider mb-3"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Current Mission
                  </h3>

                  {/* Current Mission Card */}
                  <div
                    className="p-6 rounded-xl mb-4"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: '2px solid var(--color-accent)',
                    }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2
                          className="text-2xl font-bold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {currentMission.title}
                        </h2>
                        <p
                          className="text-sm mt-1"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {formatDuration(currentMission.duration)} time cap
                        </p>
                      </div>
                    </div>

                    {/* Current Checkpoint (if any) */}
                    {currentCheckpoint && (
                      <div
                        className="p-4 rounded-lg mb-4"
                        style={{
                          backgroundColor: 'var(--color-accent-light)',
                          border: '1px solid var(--color-accent)',
                        }}
                      >
                        <p
                          className="text-xs uppercase tracking-wider mb-1"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          Current Checkpoint ({currentMission.checkpoints.filter(cp => cp.completed).length + 1}/{currentMission.checkpoints.length})
                        </p>
                        <p
                          className="font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {currentCheckpoint.title}
                        </p>
                        <p
                          className="text-sm mt-1"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {formatDuration(currentCheckpoint.duration)} time cap
                        </p>
                      </div>
                    )}

                    {/* Checkpoint progress (without revealing future checkpoints) */}
                    {currentMission.checkpoints.length > 0 && (
                      <div className="mb-4">
                        <div className="flex gap-1">
                          {currentMission.checkpoints.map((cp) => (
                            <div
                              key={cp.id}
                              className="flex-1 h-2 rounded-full"
                              style={{
                                backgroundColor: cp.completed
                                  ? 'var(--color-priority-low)'
                                  : cp.id === currentCheckpoint?.id
                                  ? 'var(--color-accent)'
                                  : 'var(--color-border)',
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Start button */}
                    <button
                      onClick={() => handleMissionClick(currentMission.id)}
                      className="w-full py-4 rounded-xl text-lg font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        backgroundColor: 'var(--color-accent)',
                        color: 'white',
                      }}
                    >
                      {currentCheckpoint ? 'Start Checkpoint' : 'Start Mission'}
                    </button>
                  </div>

                  {/* Hidden missions indicator */}
                  {pendingMissions.length > 1 && (
                    <p
                      className="text-center text-sm"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      +{pendingMissions.length - 1} more mission{pendingMissions.length - 1 > 1 ? 's' : ''} after this
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Plan View - Shows all missions for planning */}
          {viewMode === 'timeline' && (
            <>
              {/* Add new mission */}
              <div
                className="mb-6 p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: `2px dashed var(--color-border)`,
                }}
              >
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Add Mission
                </p>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newMissionTitle}
                    onChange={(e) => setNewMissionTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="What's your mission?"
                    className="flex-1 px-4 py-3 rounded-lg text-base"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      border: `1px solid var(--color-border)`,
                    }}
                  />
                  <select
                    value={newMissionDuration}
                    onChange={(e) => setNewMissionDuration(Number(e.target.value))}
                    className="px-3 py-3 rounded-lg text-base"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text-primary)',
                      border: `1px solid var(--color-border)`,
                    }}
                  >
                    <option value={15}>15m</option>
                    <option value={30}>30m</option>
                    <option value={45}>45m</option>
                    <option value={60}>1h</option>
                    <option value={90}>1h 30m</option>
                    <option value={120}>2h</option>
                    <option value={180}>3h</option>
                    <option value={240}>4h</option>
                  </select>
                  <button
                    onClick={handleAddMission}
                    disabled={!newMissionTitle.trim()}
                    className="px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: 'white',
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Mission list */}
              <div className="mb-8">
                <h3
                  className="text-sm font-semibold uppercase tracking-wider mb-3"
                  style={{ color: 'var(--color-text-tertiary)' }}
                >
                  Missions ({pendingMissions.length})
                </h3>
                <div className="space-y-3">
                  {pendingMissions.length === 0 ? (
                    <div
                      className="text-center py-8 rounded-xl"
                      style={{ backgroundColor: 'var(--color-surface)' }}
                    >
                      <p style={{ color: 'var(--color-text-tertiary)' }}>
                        No missions yet. Add your first mission above.
                      </p>
                    </div>
                  ) : (
                    pendingMissions.map((mission, index) => (
                      <div key={mission.id}>
                        <MissionBlock
                          mission={mission}
                          index={index}
                          onClick={() => setExpandedMissionId(expandedMissionId === mission.id ? null : mission.id)}
                          onDelete={deleteMission}
                          onToggleRepeating={toggleMissionRepeating}
                          onDragStart={handleDragStart}
                          onDragOver={handleDragOver}
                          onDragEnd={handleDragEnd}
                          isDragging={dragIndex === index}
                          isDragOver={dragOverIndex === index && dragIndex !== index}
                        />

                        {/* Expanded checkpoint editor */}
                        {expandedMissionId === mission.id && (
                          <div
                            className="mt-2 ml-12 p-4 rounded-xl"
                            style={{
                              backgroundColor: 'var(--color-background)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <p
                              className="text-sm font-medium mb-3"
                              style={{ color: 'var(--color-text-secondary)' }}
                            >
                              Checkpoints ({mission.checkpoints.length})
                            </p>

                            {/* Existing checkpoints */}
                            {mission.checkpoints.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {mission.checkpoints.sort((a, b) => a.order - b.order).map((cp, cpIndex) => (
                                  <div
                                    key={cp.id}
                                    className="flex items-center gap-3 p-3 rounded-lg"
                                    style={{ backgroundColor: 'var(--color-surface)' }}
                                  >
                                    <span
                                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                                      style={{
                                        backgroundColor: cp.completed ? 'var(--color-priority-low)' : 'var(--color-accent-light)',
                                        color: cp.completed ? 'white' : 'var(--color-accent)',
                                      }}
                                    >
                                      {cp.completed ? '✓' : cpIndex + 1}
                                    </span>
                                    <span
                                      className={`flex-1 ${cp.completed ? 'line-through' : ''}`}
                                      style={{ color: cp.completed ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}
                                    >
                                      {cp.title}
                                    </span>
                                    <span
                                      className="text-sm"
                                      style={{ color: 'var(--color-text-tertiary)' }}
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
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newCheckpointTitle}
                                onChange={(e) => setNewCheckpointTitle(e.target.value)}
                                onKeyDown={(e) => handleCheckpointKeyDown(e, mission.id)}
                                placeholder="Add checkpoint..."
                                className="flex-1 px-3 py-2 rounded-lg text-sm"
                                style={{
                                  backgroundColor: 'var(--color-surface)',
                                  color: 'var(--color-text-primary)',
                                  border: `1px solid var(--color-border)`,
                                }}
                              />
                              <select
                                value={newCheckpointDuration}
                                onChange={(e) => setNewCheckpointDuration(Number(e.target.value))}
                                className="px-2 py-2 rounded-lg text-sm"
                                style={{
                                  backgroundColor: 'var(--color-surface)',
                                  color: 'var(--color-text-primary)',
                                  border: `1px solid var(--color-border)`,
                                }}
                              >
                                <option value={5}>5m</option>
                                <option value={10}>10m</option>
                                <option value={15}>15m</option>
                                <option value={20}>20m</option>
                                <option value={30}>30m</option>
                                <option value={45}>45m</option>
                                <option value={60}>1h</option>
                              </select>
                              <button
                                onClick={() => handleAddCheckpoint(mission.id)}
                                disabled={!newCheckpointTitle.trim()}
                                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                style={{
                                  backgroundColor: 'var(--color-accent)',
                                  color: 'white',
                                }}
                              >
                                Add
                              </button>
                            </div>

                            {/* Start mission button */}
                            <button
                              onClick={() => handleMissionClick(mission.id)}
                              className="w-full mt-4 py-3 rounded-xl font-medium transition-all hover:scale-[1.01]"
                              style={{
                                backgroundColor: 'var(--color-accent)',
                                color: 'white',
                              }}
                            >
                              Start Mission
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Completed List */}
          {completedMissions.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompletedList(!showCompletedList)}
                className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <span>Completed ({completedMissions.length})</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showCompletedList ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showCompletedList && (
                <div className="space-y-2">
                  {completedMissions.map((mission) => (
                    <div
                      key={mission.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--color-surface)' }}
                    >
                      <div
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-priority-low)' }}
                      >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span
                        className="flex-1 line-through"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {mission.title}
                      </span>
                      {mission.checkpoints.length > 0 && (
                        <span
                          className="text-xs"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {mission.checkpoints.length} checkpoints
                        </span>
                      )}
                      <span
                        className="text-sm"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {mission.timeSpent !== undefined
                          ? formatDuration(mission.timeSpent)
                          : formatDuration(mission.duration)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
