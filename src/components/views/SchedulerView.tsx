import { useState, useCallback } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { useAI } from '../../context/AIContext';
import type { MissionCategory, MissionListItem, CognitiveLevel, MinimumViableSession, BreakdownLevel, GeneratedCheckpoint } from '../../types';
import { COGNITIVE_LEVELS, MVS_OPTIONS } from '../../types';
import { formatDuration, getEffectiveDate, getDayName, getMonthName, formatDate, getMonthGrid } from '../../utils/date';
import { MagicBreakdownOverlay, BreakdownLevelSelector } from '../MagicBreakdown';

const CATEGORY_LABELS: Record<MissionCategory, string> = {
  'need-to-do-soon': 'Need to do soon',
  'can-wait': 'Can wait',
  'sometime-future': 'Sometime in the future',
};

const CATEGORY_COLORS: Record<MissionCategory, string> = {
  'need-to-do-soon': 'var(--color-priority-high)',
  'can-wait': 'var(--color-priority-medium)',
  'sometime-future': 'var(--color-text-tertiary)',
};

export function SchedulerView() {
  const {
    dayConfig,
    missionsList,
    scheduledDays,
    addMissionToDay,
    getMissionsForDay,
    addToMissionsList,
    deleteMissionListItem,
    moveMissionListItemToCategory,
    scheduleMissionFromList,
    addCheckpointToListItem,
    deleteCheckpointFromListItem,
    deleteMission,
    assignMissionNumber,
    getAssignedMissions,
    getUnassignedMissions,
    addCheckpoint,
  } = useDayStart();

  const { aiSettings, breakdownFlow, startBreakdown, cancelBreakdown } = useAI();

  const [selectedDate, setSelectedDate] = useState(() => getEffectiveDate());
  const [calendarMonth, setCalendarMonth] = useState(() => getEffectiveDate());
  const [newMissionTitle, setNewMissionTitle] = useState('');
  const [newMissionDuration, setNewMissionDuration] = useState(30);
  const [newMissionCognitive, setNewMissionCognitive] = useState<CognitiveLevel>(3);
  const [newMissionMVS, setNewMissionMVS] = useState<MinimumViableSession>(30);
  const [showAddMissionClassification, setShowAddMissionClassification] = useState(false);
  const [expandedMissionId, setExpandedMissionId] = useState<string | null>(null);
  const [expandedListItemId, setExpandedListItemId] = useState<string | null>(null);

  // For adding to missions list
  const [showAddToList, setShowAddToList] = useState(false);
  const [newListMissionTitle, setNewListMissionTitle] = useState('');
  const [newListMissionDuration, setNewListMissionDuration] = useState(30);
  const [newListMissionCategory, setNewListMissionCategory] = useState<MissionCategory | ''>('');
  const [newListMissionCognitive, setNewListMissionCognitive] = useState<CognitiveLevel>(3);
  const [newListMissionMVS, setNewListMissionMVS] = useState<MinimumViableSession>(30);

  // For Magic Breakdown
  const [showBreakdownLevelPicker, setShowBreakdownLevelPicker] = useState(false);
  const [selectedBreakdownLevel, setSelectedBreakdownLevel] = useState<BreakdownLevel>(3);
  const [pendingMissionForBreakdown, setPendingMissionForBreakdown] = useState<{
    title: string;
    duration: number;
    cognitive: CognitiveLevel;
    mvs: MinimumViableSession;
  } | null>(null);

  const effectiveDate = getEffectiveDate();
  const selectedDateStr = formatDate(selectedDate);
  const effectiveDateStr = formatDate(effectiveDate);
  const configDateStr = dayConfig?.date;
  const isToday = selectedDateStr === effectiveDateStr && configDateStr === selectedDateStr;

  // Compare dates as strings to avoid timestamp comparison issues
  const isSelectedDateValid = selectedDateStr >= effectiveDateStr;

  // Get missions for selected day
  const selectedDayMissions = getMissionsForDay(selectedDateStr);
  const assignedMissions = isToday ? getAssignedMissions() : [];
  const unassignedMissions = isToday ? getUnassignedMissions() : [];
  const allTodayMissions = isToday ? [...assignedMissions, ...unassignedMissions] : selectedDayMissions;

  const monthDates = getMonthGrid(calendarMonth);

  // Group missions list by category
  const missionsByCategory = {
    'need-to-do-soon': missionsList.filter(m => m.category === 'need-to-do-soon'),
    'can-wait': missionsList.filter(m => m.category === 'can-wait'),
    'sometime-future': missionsList.filter(m => m.category === 'sometime-future'),
  };

  const handleAddMissionToDay = useCallback(() => {
    if (!newMissionTitle.trim()) return;
    addMissionToDay(selectedDateStr, newMissionTitle.trim(), newMissionDuration, newMissionCognitive, newMissionMVS);
    setNewMissionTitle('');
    setNewMissionDuration(30);
    setNewMissionCognitive(3);
    setNewMissionMVS(30);
    setShowAddMissionClassification(false);
  }, [newMissionTitle, newMissionDuration, newMissionCognitive, newMissionMVS, addMissionToDay, selectedDateStr]);

  const handleAddToMissionsList = useCallback(() => {
    if (!newListMissionTitle.trim() || !newListMissionCategory) return;
    addToMissionsList(newListMissionTitle.trim(), newListMissionDuration, newListMissionCategory, newListMissionCognitive, newListMissionMVS);
    setNewListMissionTitle('');
    setNewListMissionDuration(30);
    setNewListMissionCategory('');
    setNewListMissionCognitive(3);
    setNewListMissionMVS(30);
    setShowAddToList(false);
  }, [newListMissionTitle, newListMissionDuration, newListMissionCategory, newListMissionCognitive, newListMissionMVS, addToMissionsList]);

  const handleScheduleFromList = useCallback((listItemId: string) => {
    scheduleMissionFromList(listItemId, selectedDateStr);
  }, [scheduleMissionFromList, selectedDateStr]);

  // Start Magic Breakdown flow
  const handleStartBreakdown = useCallback(() => {
    if (!newMissionTitle.trim()) return;
    setPendingMissionForBreakdown({
      title: newMissionTitle.trim(),
      duration: newMissionDuration,
      cognitive: newMissionCognitive,
      mvs: newMissionMVS,
    });
    setShowBreakdownLevelPicker(true);
  }, [newMissionTitle, newMissionDuration, newMissionCognitive, newMissionMVS]);

  const handleConfirmBreakdownLevel = useCallback(async () => {
    if (!pendingMissionForBreakdown) return;
    setShowBreakdownLevelPicker(false);
    await startBreakdown(pendingMissionForBreakdown.title, selectedBreakdownLevel);
  }, [pendingMissionForBreakdown, selectedBreakdownLevel, startBreakdown]);

  const handleBreakdownAccept = useCallback((checkpoints: GeneratedCheckpoint[], totalMinutes: number) => {
    if (!pendingMissionForBreakdown) return;

    // Create the mission
    addMissionToDay(
      selectedDateStr,
      pendingMissionForBreakdown.title,
      totalMinutes,
      pendingMissionForBreakdown.cognitive,
      pendingMissionForBreakdown.mvs
    );

    // Get the newly created mission ID (it will be the last one added)
    // We need to add checkpoints after the mission is created
    // For now, we'll use a slight delay to ensure the state has updated
    setTimeout(() => {
      const missions = getMissionsForDay(selectedDateStr);
      const newMission = missions.find(m => m.title === pendingMissionForBreakdown.title);
      if (newMission) {
        checkpoints.forEach(cp => {
          addCheckpoint(newMission.id, cp.title, cp.estimatedMinutes);
        });
      }
    }, 100);

    // Reset form
    setNewMissionTitle('');
    setNewMissionDuration(30);
    setNewMissionCognitive(3);
    setNewMissionMVS(30);
    setShowAddMissionClassification(false);
    setPendingMissionForBreakdown(null);
  }, [pendingMissionForBreakdown, selectedDateStr, addMissionToDay, getMissionsForDay, addCheckpoint]);

  const handleBreakdownCancel = useCallback(() => {
    setPendingMissionForBreakdown(null);
    cancelBreakdown();
  }, [cancelBreakdown]);

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

  // Check if a day has scheduled missions
  const getDayMissionCount = (dateStr: string) => {
    if (configDateStr === dateStr && dayConfig) {
      return dayConfig.missions.length;
    }
    const scheduled = scheduledDays.find(sd => sd.date === dateStr);
    return scheduled?.missions.length || 0;
  };

  return (
    <div className="h-full flex">
      {/* Left side - Calendar and Missions List */}
      <div
        className="w-80 flex-shrink-0 border-r overflow-auto"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
      >
        {/* Calendar */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
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
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div
                key={i}
                className="text-center text-xs font-medium py-1"
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
              const missionCount = getDayMissionCount(dateStr);

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className="relative aspect-square rounded-lg text-xs font-medium transition-colors"
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
                  {missionCount > 0 && !isSelected && (
                    <span
                      className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full"
                      style={{ backgroundColor: 'var(--color-accent)' }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick actions */}
          <button
            onClick={() => setSelectedDate(effectiveDate)}
            className="w-full mt-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
            }}
          >
            Jump to Today
          </button>
        </div>

        {/* Missions List */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Missions List
            </h3>
            <button
              onClick={() => setShowAddToList(!showAddToList)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: 'var(--color-accent)' }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Add to list form */}
          {showAddToList && (
            <div
              className="p-3 rounded-lg mb-4"
              style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
            >
              <input
                type="text"
                value={newListMissionTitle}
                onChange={(e) => setNewListMissionTitle(e.target.value)}
                placeholder="Mission title..."
                className="w-full px-3 py-2 rounded-lg text-sm mb-2"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
              />
              <div className="flex gap-2 mb-2">
                <select
                  value={newListMissionDuration}
                  onChange={(e) => setNewListMissionDuration(Number(e.target.value))}
                  className="flex-1 px-2 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-surface)',
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
                </select>
              </div>

              {/* Cognitive Level */}
              <div className="mb-2">
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Mental Effort Required
                </p>
                <div className="space-y-1">
                  {([5, 4, 3, 2, 1] as CognitiveLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setNewListMissionCognitive(level)}
                      className="w-full px-2 py-1.5 rounded text-left text-xs transition-colors"
                      style={{
                        backgroundColor: newListMissionCognitive === level ? 'var(--color-accent-light)' : 'transparent',
                        color: newListMissionCognitive === level ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        border: newListMissionCognitive === level ? '1px solid var(--color-accent)' : '1px solid transparent',
                      }}
                    >
                      <span className="font-medium">{COGNITIVE_LEVELS[level].label}</span>
                      <span className="block text-[10px] opacity-70">{COGNITIVE_LEVELS[level].feeling}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Minimum Session */}
              <div className="mb-2">
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Min Time to Make Progress
                </p>
                <select
                  value={newListMissionMVS}
                  onChange={(e) => setNewListMissionMVS(Number(e.target.value) as MinimumViableSession)}
                  className="w-full px-2 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {MVS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="mb-2">
                <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  Priority
                </p>
                <div className="space-y-1">
                  {(Object.keys(CATEGORY_LABELS) as MissionCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewListMissionCategory(cat)}
                      className="w-full px-2 py-1.5 rounded text-left text-xs transition-colors"
                      style={{
                        backgroundColor: newListMissionCategory === cat ? 'var(--color-accent-light)' : 'transparent',
                        color: newListMissionCategory === cat ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        border: newListMissionCategory === cat ? '1px solid var(--color-accent)' : '1px solid transparent',
                      }}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAddToMissionsList}
                disabled={!newListMissionTitle.trim() || !newListMissionCategory}
                className="w-full px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
              >
                Add to List
              </button>
            </div>
          )}

          {/* Categories */}
          <div className="space-y-4">
            {(Object.keys(CATEGORY_LABELS) as MissionCategory[]).map((category) => {
              const items = missionsByCategory[category];
              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {CATEGORY_LABELS[category]} ({items.length})
                    </span>
                  </div>
                  {items.length > 0 && (
                    <div className="space-y-1">
                      {items.map((item) => (
                        <MissionListCard
                          key={item.id}
                          item={item}
                          isExpanded={expandedListItemId === item.id}
                          onToggleExpand={() => setExpandedListItemId(expandedListItemId === item.id ? null : item.id)}
                          onSchedule={() => handleScheduleFromList(item.id)}
                          onDelete={() => deleteMissionListItem(item.id)}
                          onMoveToCategory={(cat) => moveMissionListItemToCategory(item.id, cat)}
                          onAddCheckpoint={(title, duration) => {
                            addCheckpointToListItem(item.id, title, duration);
                          }}
                          onDeleteCheckpoint={(idx) => deleteCheckpointFromListItem(item.id, idx)}
                          selectedDateLabel={`${getMonthName(selectedDate).slice(0, 3)} ${selectedDate.getDate()}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right side - Day missions */}
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
          {!isToday && isSelectedDateValid && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Future day - Schedule missions for this day
            </p>
          )}
          {!isSelectedDateValid && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              Past day
            </p>
          )}
        </div>

        {/* Add new mission (for today and future days) */}
        {isSelectedDateValid && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <h3
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Add Mission to {isToday ? 'Today' : `${getMonthName(selectedDate).slice(0, 3)} ${selectedDate.getDate()}`}
            </h3>
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={newMissionTitle}
                onChange={(e) => setNewMissionTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && newMissionTitle.trim() && setShowAddMissionClassification(true)}
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
                onClick={() => newMissionTitle.trim() && setShowAddMissionClassification(!showAddMissionClassification)}
                disabled={!newMissionTitle.trim()}
                className="px-4 py-3 rounded-lg font-medium disabled:opacity-50"
                style={{
                  backgroundColor: showAddMissionClassification ? 'var(--color-accent-light)' : 'var(--color-background)',
                  color: showAddMissionClassification ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Classify
              </button>
              {/* Magic Breakdown button - only show if API key is configured */}
              {aiSettings.apiKey && (
                <button
                  onClick={handleStartBreakdown}
                  disabled={!newMissionTitle.trim()}
                  className="px-4 py-3 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                  }}
                  title="Use AI to break down this task"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Magic
                </button>
              )}
            </div>

            {/* Classification section */}
            {showAddMissionClassification && newMissionTitle.trim() && (
              <div
                className="p-4 rounded-lg mb-3"
                style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
              >
                {/* Cognitive Level */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    How much mental effort does this require?
                  </p>
                  <div className="grid gap-2">
                    {([5, 4, 3, 2, 1] as CognitiveLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setNewMissionCognitive(level)}
                        className="w-full p-3 rounded-lg text-left transition-colors"
                        style={{
                          backgroundColor: newMissionCognitive === level ? 'var(--color-accent-light)' : 'var(--color-surface)',
                          border: newMissionCognitive === level ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                        }}
                      >
                        <span
                          className="font-semibold text-sm"
                          style={{ color: newMissionCognitive === level ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                        >
                          {COGNITIVE_LEVELS[level].label}
                        </span>
                        <span
                          className="block text-xs mt-0.5"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {COGNITIVE_LEVELS[level].feeling}
                        </span>
                        <span
                          className="block text-xs mt-1 italic"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          e.g., {COGNITIVE_LEVELS[level].examples[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minimum Session */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    Minimum time needed to make progress
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {MVS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setNewMissionMVS(opt.value)}
                        className="p-2 rounded-lg text-center transition-colors"
                        style={{
                          backgroundColor: newMissionMVS === opt.value ? 'var(--color-accent-light)' : 'var(--color-surface)',
                          border: newMissionMVS === opt.value ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                          color: newMissionMVS === opt.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        }}
                      >
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddMissionToDay}
                  className="w-full px-6 py-3 rounded-lg font-medium"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'white',
                  }}
                >
                  Add Mission
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mission list */}
        <div className="space-y-4">
          {allTodayMissions.length === 0 ? (
            <div
              className="text-center py-12 rounded-xl"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <svg
                className="w-12 h-12 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p style={{ color: 'var(--color-text-secondary)' }}>
                No missions scheduled for this day.
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                Add a mission above or drag one from your missions list.
              </p>
            </div>
          ) : (
            allTodayMissions.map((mission) => (
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
                          className="text-lg font-medium"
                          style={{ color: 'var(--color-text-primary)' }}
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
                      {mission.checkpoints.length > 0 && (
                        <p
                          className="text-sm mt-1"
                          style={{ color: 'var(--color-text-tertiary)' }}
                        >
                          {mission.checkpoints.length} checkpoint{mission.checkpoints.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Mission number dropdown (only for today) */}
                      {isToday && (
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
                      )}

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
                        Checkpoints
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
                    {mission.checkpoints.length > 0 ? (
                      <div className="space-y-2">
                        {mission.checkpoints.map((cp, idx) => (
                          <div
                            key={cp.id}
                            className="flex items-center gap-3 p-3 rounded-lg"
                            style={{ backgroundColor: 'var(--color-surface)' }}
                          >
                            <span
                              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                              style={{
                                backgroundColor: cp.completed ? 'var(--color-priority-low)' : 'var(--color-accent-light)',
                                color: cp.completed ? 'white' : 'var(--color-accent)',
                              }}
                            >
                              {cp.completed ? '✓' : idx + 1}
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
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        className="text-center py-4 text-sm"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        No checkpoints. Add checkpoints when creating missions in the missions list.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Breakdown Level Picker Modal */}
      {showBreakdownLevelPicker && pendingMissionForBreakdown && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 z-50"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xl font-bold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                Magic Breakdown
              </h2>
              <button
                onClick={() => {
                  setShowBreakdownLevelPicker(false);
                  setPendingMissionForBreakdown(null);
                }}
                className="p-2 rounded-lg hover:opacity-70"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Breaking down: <strong>{pendingMissionForBreakdown.title}</strong>
            </p>

            <BreakdownLevelSelector
              selectedLevel={selectedBreakdownLevel}
              onSelectLevel={setSelectedBreakdownLevel}
            />

            <button
              onClick={handleConfirmBreakdownLevel}
              className="w-full mt-6 py-3 rounded-xl font-medium"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'white',
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Magic Breakdown Overlay */}
      {breakdownFlow && (
        <MagicBreakdownOverlay
          onAccept={handleBreakdownAccept}
          onCancel={handleBreakdownCancel}
        />
      )}
    </div>
  );
}

// Mission List Card Component
interface MissionListCardProps {
  item: MissionListItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onSchedule: () => void;
  onDelete: () => void;
  onMoveToCategory: (category: MissionCategory) => void;
  onAddCheckpoint: (title: string, duration: number) => void;
  onDeleteCheckpoint: (index: number) => void;
  selectedDateLabel: string;
}

function MissionListCard({
  item,
  isExpanded,
  onToggleExpand,
  onSchedule,
  onDelete,
  onMoveToCategory,
  onAddCheckpoint,
  onDeleteCheckpoint,
  selectedDateLabel,
}: MissionListCardProps) {
  const [newCpTitle, setNewCpTitle] = useState('');
  const [newCpDuration, setNewCpDuration] = useState(15);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const handleAddCp = () => {
    if (!newCpTitle.trim()) return;
    onAddCheckpoint(newCpTitle.trim(), newCpDuration);
    setNewCpTitle('');
    setNewCpDuration(15);
  };

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
    >
      <div className="p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {item.title}
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {formatDuration(item.duration)} &middot; {item.checkpoints.length} cp
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleExpand}
              className="p-1 rounded hover:opacity-70"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div
          className="p-2 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Checkpoints */}
          {item.checkpoints.length > 0 && (
            <div className="space-y-1 mb-2">
              {item.checkpoints.map((cp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs p-1.5 rounded"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{idx + 1}.</span>
                  <span className="flex-1" style={{ color: 'var(--color-text-secondary)' }}>{cp.title}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}>{formatDuration(cp.duration)}</span>
                  <button
                    onClick={() => onDeleteCheckpoint(idx)}
                    className="p-0.5 rounded hover:opacity-70"
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

          {/* Add checkpoint */}
          <div className="flex gap-1 mb-2">
            <input
              type="text"
              value={newCpTitle}
              onChange={(e) => setNewCpTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCp()}
              placeholder="Add checkpoint..."
              className="flex-1 px-2 py-1 rounded text-xs"
              style={{
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
              }}
            />
            <select
              value={newCpDuration}
              onChange={(e) => setNewCpDuration(Number(e.target.value))}
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
            </select>
            <button
              onClick={handleAddCp}
              disabled={!newCpTitle.trim()}
              className="px-2 py-1 rounded text-xs font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
            >
              +
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <button
              onClick={onSchedule}
              className="flex-1 px-2 py-1.5 rounded text-xs font-medium"
              style={{ backgroundColor: 'var(--color-priority-low)', color: 'white' }}
            >
              Schedule ({selectedDateLabel})
            </button>
            <div className="relative">
              <button
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="px-2 py-1.5 rounded text-xs"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Move
              </button>
              {showMoveMenu && (
                <div
                  className="absolute bottom-full left-0 mb-1 w-40 rounded-lg shadow-lg z-10"
                  style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  {(Object.keys(CATEGORY_LABELS) as MissionCategory[])
                    .filter(cat => cat !== item.category)
                    .map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          onMoveToCategory(cat);
                          setShowMoveMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-xs hover:opacity-70"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {CATEGORY_LABELS[cat]}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <button
              onClick={onDelete}
              className="px-2 py-1.5 rounded text-xs"
              style={{ color: 'var(--color-priority-urgent)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
