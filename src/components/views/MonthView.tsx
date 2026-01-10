import { useTasks } from '../../context/TaskContext';
import { formatDate, isToday, getMonthGrid } from '../../utils/date';
import type { Priority } from '../../types';

interface MonthViewProps {
  date: Date;
}

const priorityColors: Record<Priority, string> = {
  urgent: 'var(--color-priority-urgent)',
  high: 'var(--color-priority-high)',
  medium: 'var(--color-priority-medium)',
  low: 'var(--color-priority-low)',
  none: 'var(--color-priority-none)',
};

export function MonthView({ date }: MonthViewProps) {
  const { getTasksForDate } = useTasks();
  const days = getMonthGrid(date);
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="h-full p-6 flex flex-col">
      {/* Week day headers */}
      <div
        className="grid grid-cols-7 gap-px mb-2"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium uppercase tracking-wide"
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        className="flex-1 grid grid-cols-7 gap-px"
        style={{ backgroundColor: 'var(--color-border)' }}
      >
        {days.map((dayDate, index) => {
          const dateString = formatDate(dayDate);
          const tasks = getTasksForDate(dateString);
          const today = isToday(dayDate);
          const isCurrentMonth = dayDate.getMonth() === date.getMonth();

          return (
            <div
              key={index}
              className="min-h-[100px] p-2 flex flex-col"
              style={{
                backgroundColor: 'var(--color-background)',
                opacity: isCurrentMonth ? 1 : 0.4,
              }}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${today ? 'flex items-center justify-center w-7 h-7 rounded-full' : ''}`}
                  style={{
                    color: today ? 'white' : 'var(--color-text-primary)',
                    backgroundColor: today ? 'var(--color-today)' : 'transparent',
                  }}
                >
                  {dayDate.getDate()}
                </span>
                {tasks.length > 0 && (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {tasks.length}
                  </span>
                )}
              </div>

              {/* Tasks preview */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {tasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="text-xs py-0.5 px-1.5 rounded truncate"
                    style={{
                      backgroundColor: `${priorityColors[task.priority]}15`,
                      borderLeft: `2px solid ${priorityColors[task.priority]}`,
                      color: 'var(--color-text-primary)',
                      opacity: task.completed ? 0.5 : 1,
                      textDecoration: task.completed ? 'line-through' : 'none',
                    }}
                  >
                    {task.title}
                  </div>
                ))}
                {tasks.length > 3 && (
                  <div
                    className="text-xs"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    +{tasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
