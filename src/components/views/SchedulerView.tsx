import { useState, useCallback } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { formatDuration, getEffectiveDate, getDayName, getMonthName, formatDate, getMonthGrid } from '../../utils/date';

export function SchedulerView() {
  const {
    dayConfig,
    addMission,
    updateMission,
    deleteMission,
    addCheckpoint,
    deleteCheckpoint,
    assignMissionNumber,
    getAssignedMissions,
    getUnassignedMissions,
  } = useDayStart();

  const [selectedDate, setSelectedDate] = useState(() => getEffectiveDate());
  const [calendarMonth, setCalendarMonth] = useState(() => getEffectiveDate());
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDuration, setNewMissionDuration] = useState(30);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [newCheckpointTitle, setNewCheckpointTitle] = useState('');
  const [newCheckpointDuration, setNewCheckpointDuration] = useState(15);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const effectiveDate = getEffectiveDate();
  const isToday = formatDate(selectedDate) === formatDate(effectiveDate);
  const selectedDateStr = formatDate(selectedDate);
  const configDateStr = dayConfig?.date;

  // Only show missions for today (the configured day)
  const canEditMissions = isToday && configDateStr === selectedDateStr;
  const assignedMissions = canEditMissions ? getAssignedMissions() : [];
  const unassignedMissions = canEditMissions ? getUnassignedMissions() : [];
  const allMissions = [...assignedMissions, ...unassignedMissions];

  const monthDates = getMonthGrid(calendarMonth);

  const handleAddMission = useCallback(() => {
    if (!newMissionTitle.trim() || !canEditMissions) return;
    addMission(newMissionTitle.trim(), newMissionDuration);
    setNewMissionTitle('');
    setNewMissionDuration(30);
  }, [newMissionTitle, newMissionDuration, addMission, canEditMissions]);

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

  const startEditing = (mission: typeof allMissions[0]) => {
    setEditingMissionId(mission.id);
    setEditingTitle(mission.title);
  };

  const saveEditing = () => {
    if (editingMissionId && editingTitle.trim()) {
      updateMission(editingMissionId, { title: editingTitle.trim() });
    }
    setEditingMissionId(null);
    setEditingTitle('');
  };

  const cancelEditing = () => {
    setEditingMissionId(null);
    setEditingTitle('');
  };

  // Get available mission numbers (1-15 minus already assigned)
  const getAvailableMissionNumbers = (currentMissionId?: string) => {
    const usedNumbers = assignedMissions
      .filter(m => m.id !== currentMissionId)
      .map(m => m.missionNumber)
      .filter(n => n !== undefined);
    return Array.from({ length: 15 }, (_, i) => i + 1).filter(n => !usedNumbers.includes(n));
  };

  const navigateMonth = (delta: number) => {
    const newDate = new Date(calendarMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCalendarMonth(newDate);
  };

  return (
    <div className="h-full flex">
      {/* Left side - Calendar */}
      <div
        className="w-80 flex-shrink-0 border-r p-4 overflow-auto"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {getMonthName(calendarMonth)} {calendarMonth.getFullYear()}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div
              key={day}
              className="text-center text-xs font-medium py-2"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {monthDates.map((date, idx) => {
            const dateStr = formatDate(date);
            const isSelected = dateStr === selectedDateStr;
            const isEffectiveToday = dateStr === formatDate(effectiveDate);
            const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();

            return (
              <button
                key={idx}
                onClick={() => setSelectedDate(date)}
                className="aspect-square rounded-lg text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isSelected
                    ? 'var(--color-accent)'
                    : isEffectiveToday
                    ? 'var(--color-accent-light)'
                    : 'transparent',
                  color: isSelected
                    ? 'white'
                    : isCurrentMonth
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-tertiary)',
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {/* Quick actions */}
        <div className="mt-4 space-y-2">
          <button
            onClick={() => setSelectedDate(effectiveDate)}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            Jump to Today
          </button>
        </div>
      </div>

      {/* Right side - Mission editor */}
      <div className="flex-1 overflow-auto p-6">
        {/* Selected date header */}
        <div className="mb-6">
          <h2
            className="text-2xl font-bold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {getDayName(selectedDate)}, {getMonthName(selectedDate)} {selectedDate.getDate()}
          </h2>
          {isToday && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-accent)' }}>
              Today - Edit missions below
            </p>
          )}
          {!isToday && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {selectedDate < effectiveDate ? 'Past day' : 'Future day'} - Scheduling for future days coming soon
            </p>
          )}
        </div>

        {canEditMissions ? (
          <>
            {/* Add new mission */}
            <div
              className="mb-6 p-4 rounded-xl"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <h3
                className="text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Add New Mission
              </h3>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMissionTitle}
                  onChange={(e) => setNewMissionTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Mission title..."
                  className="flex-1 px-4 py-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                />
                <select
                  value={newMissionDuration}
                  onChange={(e) => setNewMissionDuration(Number(e.target.value))}
                  className="px-4 py-3 rounded-lg"
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
                  className="px-6 py-3 rounded-lg font-medium disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                  }}
                >
                  Add Mission
                </button>
              </div>
            </div>

            {/* Mission list */}
            <div className="space-y-4">
              {allMissions.length === 0 ? (
                <div
                  className="text-center py-12 rounded-xl"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <p style={{ color: 'var(--color-text-secondary)' }}>
                    No missions yet. Add your first mission above.
                  </p>
                </div>
              ) : (
                allMissions.map((mission) => (
                  <div
                    key={mission.id}
                    className="rounded-xl overflow-hidden"
                    style={{
                      backgroundColor: 'var(--color-surface)',
                      border: `2px solid ${mission.missionNumber ? 'var(--color-priority-low)' : 'var(--color-border)'}`,
                    }}
                  >
                    {/* Mission header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          {editingMissionId === mission.id ? (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditing();
                                  if (e.key === 'Escape') cancelEditing();
                                }}
                                autoFocus
                                className="flex-1 px-3 py-2 rounded-lg text-lg font-medium"
                                style={{
                                  backgroundColor: 'var(--color-background)',
                                  color: 'var(--color-text-primary)',
                                  border: '1px solid var(--color-accent)',
                                }}
                              />
                              <button
                                onClick={saveEditing}
                                className="px-3 py-2 rounded-lg"
                                style={{ backgroundColor: 'var(--color-priority-low)', color: 'white' }}
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditing}
                                className="px-3 py-2 rounded-lg"
                                style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              {mission.missionNumber && (
                                <span
                                  className="text-sm font-bold px-2 py-1 rounded"
                                  style={{
                                    backgroundColor: 'var(--color-priority-low)',
                                    color: 'white',
                                  }}
                                >
                                  #{mission.missionNumber}
                                </span>
                              )}
                              <h3
                                className="text-lg font-medium cursor-pointer hover:opacity-70"
                                style={{ color: 'var(--color-text-primary)' }}
                                onClick={() => startEditing(mission)}
                              >
                                {mission.title}
                              </h3>
                              <span
                                className="text-sm px-2 py-1 rounded"
                                style={{
                                  backgroundColor: 'var(--color-background)',
                                  color: 'var(--color-text-tertiary)',
                                }}
                              >
                                {formatDuration(mission.duration)}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Mission number dropdown */}
                          <select
                            value={mission.missionNumber || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              assignMissionNumber(mission.id, val ? Number(val) : undefined);
                            }}
                            className="px-3 py-2 rounded-lg text-sm"
                            style={{
                              backgroundColor: 'var(--color-background)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            <option value="">No #</option>
                            {mission.missionNumber && (
                              <option value={mission.missionNumber}>#{mission.missionNumber}</option>
                            )}
                            {getAvailableMissionNumbers(mission.id).map(n => (
                              <option key={n} value={n}>#{n}</option>
                            ))}
                          </select>

                          {/* Expand checkpoints */}
                          <button
                            onClick={() => setExpandedMissionId(expandedMissionId === mission.id ? null : mission.id)}
                            className="px-3 py-2 rounded-lg text-sm"
                            style={{
                              backgroundColor: expandedMissionId === mission.id ? 'var(--color-accent-light)' : 'var(--color-background)',
                              color: expandedMissionId === mission.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            Checkpoints ({mission.checkpoints.length})
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => deleteMission(mission.id)}
                            className="p-2 rounded-lg transition-colors hover:opacity-70"
                            style={{ color: 'var(--color-priority-urgent)' }}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded checkpoints */}
                    {expandedMissionId === mission.id && (
                      <div
                        className="p-4 border-t"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
                      >
                        {/* Existing checkpoints */}
                        {mission.checkpoints.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {mission.checkpoints.map((cp, idx) => (
                              <div
                                key={cp.id}
                                className="flex items-center gap-3 p-3 rounded-lg"
                                style={{ backgroundColor: 'var(--color-surface)' }}
                              >
                                <span
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                                  style={{
                                    backgroundColor: 'var(--color-accent-light)',
                                    color: 'var(--color-accent)',
                                  }}
                                >
                                  {idx + 1}
                                </span>
                                <span
                                  className="flex-1"
                                  style={{ color: 'var(--color-text-primary)' }}
                                >
                                  {cp.title}
                                </span>
                                <span
                                  className="text-sm px-2 py-1 rounded"
                                  style={{
                                    backgroundColor: 'var(--color-background)',
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
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCheckpointTitle}
                            onChange={(e) => setNewCheckpointTitle(e.target.value)}
                            onKeyDown={(e) => handleCheckpointKeyDown(e, mission.id)}
                            placeholder="Add checkpoint..."
                            className="flex-1 px-3 py-2 rounded-lg"
                            style={{
                              backgroundColor: 'var(--color-surface)',
                              color: 'var(--color-text-primary)',
                              border: '1px solid var(--color-border)',
                            }}
                          />
                          <select
                            value={newCheckpointDuration}
                            onChange={(e) => setNewCheckpointDuration(Number(e.target.value))}
                            className="px-3 py-2 rounded-lg"
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
                            className="px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                            style={{
                              backgroundColor: 'var(--color-accent)',
                              color: 'white',
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div
            className="text-center py-16 rounded-xl"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="var(--color-text-tertiary)"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p
              className="text-lg font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {selectedDate < effectiveDate ? 'Past Day' : 'Future Day'}
            </p>
            <p style={{ color: 'var(--color-text-tertiary)' }}>
              You can only edit missions for today. Select today from the calendar to add or modify missions.
            </p>
            <button
              onClick={() => setSelectedDate(effectiveDate)}
              className="mt-4 px-4 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
              }}
            >
              Go to Today
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
