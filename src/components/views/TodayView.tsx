import { useState, useCallback } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { GoalBlock } from '../GoalBlock';
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
  const { dayConfig, addGoal, deleteGoal, reorderGoals, toggleGoalComplete } = useDayStart();
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDuration, setNewGoalDuration] = useState(30);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const effectiveDate = getEffectiveDate();
  const isToday = date.toDateString() === effectiveDate.toDateString();

  const goals = dayConfig?.goals.sort((a, b) => a.order - b.order) || [];
  const totalDuration = goals.reduce((sum, g) => sum + g.duration, 0);
  const completedDuration = goals.filter(g => g.completed).reduce((sum, g) => sum + g.duration, 0);

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

  const handleDragStart = useCallback((_e: React.DragEvent, index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, index: number) => {
    setDragOverIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const newGoals = [...goals];
      const [draggedGoal] = newGoals.splice(dragIndex, 1);
      newGoals.splice(dragOverIndex, 0, draggedGoal);
      reorderGoals(newGoals.map(g => g.id));
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }, [dragIndex, dragOverIndex, goals, reorderGoals]);

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
                className="h-full rounded-full transition-all duration-300"
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

        {/* Goal blocks list */}
        <div className="space-y-3">
          {goals.length === 0 ? (
            <div
              className="text-center py-12 rounded-xl"
              style={{ backgroundColor: 'var(--color-surface)' }}
            >
              <p style={{ color: 'var(--color-text-tertiary)' }}>
                No goals yet. Add your first goal block above.
              </p>
            </div>
          ) : (
            goals.map((goal, index) => (
              <GoalBlock
                key={goal.id}
                goal={goal}
                index={index}
                onToggleComplete={toggleGoalComplete}
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

        {/* Summary */}
        {goals.length > 0 && (
          <div className="mt-6 text-center">
            <p style={{ color: 'var(--color-text-tertiary)' }}>
              {goals.filter(g => g.completed).length} of {goals.length} goals completed
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
