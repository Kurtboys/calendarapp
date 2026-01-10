import { TaskBlock } from './TaskBlock';
import { useTasks } from '../context/TaskContext';
import { formatDate, isToday, getDayName, getShortDayName } from '../utils/date';

interface DayColumnProps {
  date: Date;
  compact?: boolean;
  showDayName?: boolean;
}

export function DayColumn({ date, compact = false, showDayName = true }: DayColumnProps) {
  const { getTasksForDate } = useTasks();
  const dateString = formatDate(date);
  const tasks = getTasksForDate(dateString);
  const today = isToday(date);

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div
        className="flex-shrink-0 pb-3 mb-3"
        style={{ borderBottom: `1px solid var(--color-border)` }}
      >
        {showDayName && (
          <div
            className="text-xs font-medium uppercase tracking-wide mb-1"
            style={{ color: today ? 'var(--color-today)' : 'var(--color-text-tertiary)' }}
          >
            {compact ? getShortDayName(date) : getDayName(date)}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`text-2xl font-semibold ${today ? 'flex items-center justify-center w-10 h-10 rounded-full' : ''}`}
            style={{
              color: today ? 'white' : 'var(--color-text-primary)',
              backgroundColor: today ? 'var(--color-today)' : 'transparent',
            }}
          >
            {date.getDate()}
          </span>
          {!compact && (
            <span
              className="text-sm"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {tasks.length === 0 ? (
          <div
            className="text-sm py-4 text-center"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            No tasks
          </div>
        ) : (
          tasks.map(task => (
            <TaskBlock key={task.id} task={task} compact={compact} />
          ))
        )}
      </div>

      {/* Add task button */}
      <button
        className="mt-3 py-2 px-3 rounded-lg text-sm font-medium transition-colors w-full text-left"
        style={{
          color: 'var(--color-text-tertiary)',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--color-text-tertiary)';
        }}
      >
        + Add task
      </button>
    </div>
  );
}
