import { useState, useCallback } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { GoalBlock } from '../GoalBlock';
import { ActiveGoalModal } from '../ActiveGoalModal';
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
    activeGoal,
    addGoal,
    deleteGoal,
    reorderGoals,
    startGoal,
  } = useDayStart();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDuration, setNewGoalDuration] = useState(30);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [showDoneList, setShowDoneList] = useState(true);

  const effectiveDate = getEffectiveDate();
  const isToday = date.toDateString() === effectiveDate.toDateString();

  const allGoals = dayConfig?.goals || [];
  const pendingGoals = allGoals.filter(g => !g.completed).sort((a, b) => a.order - b.order);
  const completedGoals = allGoals.filter(g => g.completed).sort((a, b) => {
    // Sort by completion time, most recent first
    if (a.completedAt && b.completedAt) {
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    }
    return 0;
  });

  const totalDuration = allGoals.reduce((sum, g) => sum + g.duration, 0);
  const completedDuration = completedGoals.reduce((sum, g) => sum + (g.timeSpent || g.duration), 0);

  const handleAddGoal = useCallback(() => {
    if (!newGoalTitle.trim()) return;
    addGoal(newGoalTitle.trim(), newGoalDuration);
    setNewGoalTitle('');
    setNewGoalDuration(30);
  }, [newGoalTitle, newGoalDuration, addGoal]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddGoal();
    }
  };

  const handleGoalClick = (goalId: string) => {
    startGoal(goalId);
  };

  const handleDragStart = useCallback((_e: React.DragEvent, index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newGoals = [...pendingGoals];
      const [draggedGoal] = newGoals.splice(dragIndex, 1);
      newGoals.splice(dragOverIndex, 0, draggedGoal);
      reorderGoals(newGoals.map(g => g.id));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, pendingGoals, reorderGoals]);

  if (!isToday) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {getDayName(date)}, {getMonthName(date)} {date.getDate()}
          </p>
          <p className="mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
            Goals are only shown for today
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Active Goal Modal */}
      {activeGoal && <ActiveGoalModal />}

      <div className="h-full overflow-auto">
        <div className="max-w-2xl mx-auto p-6">
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
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
                    Progress
                  </p>
                  <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {formatDuration(completedDuration)} / {formatDuration(totalDuration)}
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
                    width: totalDuration > 0 ? `${(completedDuration / totalDuration) * 100}%` : '0%',
                    backgroundColor: 'var(--color-accent)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Add new goal */}
          <div
            className="mb-6 p-4 rounded-xl"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: `2px dashed var(--color-border)`,
            }}
          >
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              Add Goal Block
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to accomplish?"
                className="flex-1 px-4 py-3 rounded-lg text-base"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  border: `1px solid var(--color-border)`,
                }}
              />
              <select
                value={newGoalDuration}
                onChange={(e) => setNewGoalDuration(Number(e.target.value))}
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
                onClick={handleAddGoal}
                disabled={!newGoalTitle.trim()}
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

          {/* Pending Goals Queue */}
          <div className="mb-8">
            <h3
              className="text-sm font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Up Next ({pendingGoals.length})
            </h3>
            <div className="space-y-3">
              {pendingGoals.length === 0 ? (
                <div
                  className="text-center py-8 rounded-xl"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <p style={{ color: 'var(--color-text-tertiary)' }}>
                    {completedGoals.length > 0
                      ? 'All goals completed! Add more or enjoy your day.'
                      : 'No goals yet. Add your first goal block above.'}
                  </p>
                </div>
              ) : (
                pendingGoals.map((goal, index) => (
                  <GoalBlock
                    key={goal.id}
                    goal={goal}
                    index={index}
                    onClick={() => handleGoalClick(goal.id)}
                    onDelete={deleteGoal}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    isDragging={dragIndex === index}
                    isDragOver={dragOverIndex === index && dragIndex !== index}
                  />
                ))
              )}
            </div>
          </div>

          {/* Done List */}
          {completedGoals.length > 0 && (
            <div>
              <button
                onClick={() => setShowDoneList(!showDoneList)}
                className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider mb-3"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <span>Done List ({completedGoals.length})</span>
                <svg
                  className={`w-4 h-4 transition-transform ${showDoneList ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showDoneList && (
                <div className="space-y-2">
                  {completedGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--color-surface)' }}
                    >
                      {/* Checkmark */}
                      <div
                        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'var(--color-priority-low)' }}
                      >
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>

                      {/* Title */}
                      <span
                        className="flex-1 line-through"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {goal.title}
                      </span>

                      {/* Time spent */}
                      <span
                        className="text-sm"
                        style={{ color: 'var(--color-text-tertiary)' }}
                      >
                        {goal.timeSpent !== undefined
                          ? formatDuration(goal.timeSpent)
                          : formatDuration(goal.duration)}
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
