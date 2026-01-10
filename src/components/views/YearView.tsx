import { useTasks } from '../../context/TaskContext';
import { formatDate, isToday, getMonthGrid, getMonthName } from '../../utils/date';
import type { Priority } from '../../types';

interface YearViewProps {
  year: number;
}

const priorityColors: Record<Priority, string> = {
  urgent: 'var(--color-priority-urgent)',
  high: 'var(--color-priority-high)',
  medium: 'var(--color-priority-medium)',
  low: 'var(--color-priority-low)',
  none: 'var(--color-priority-none)',
};

function MiniMonth({ date }: { date: Date }) {
  const { getTasksForDate } = useTasks();
  const days = getMonthGrid(date);
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div
      className="p-4 rounded-xl"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* Month header */}
      <h3
        className="text-sm font-semibold mb-3"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {getMonthName(date)}
      </h3>

      {/* Week day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.slice(0, 35).map((dayDate, index) => {
          const dateString = formatDate(dayDate);
          const tasks = getTasksForDate(dateString);
          const today = isToday(dayDate);
          const isCurrentMonth = dayDate.getMonth() === date.getMonth();
          const hasUrgent = tasks.some(t => t.priority === 'urgent' && !t.completed);
          const hasHigh = tasks.some(t => t.priority === 'high' && !t.completed);
          const hasTasks = tasks.length > 0;

          let dotColor = '';
          if (hasUrgent) dotColor = priorityColors.urgent;
          else if (hasHigh) dotColor = priorityColors.high;
          else if (hasTasks) dotColor = 'var(--color-accent)';

          return (
            <div
              key={index}
              className="relative aspect-square flex flex-col items-center justify-center"
              style={{
                opacity: isCurrentMonth ? 1 : 0.3,
              }}
            >
              <span
                className={`text-[11px] flex items-center justify-center w-5 h-5 ${today ? 'rounded-full' : ''}`}
                style={{
                  color: today ? 'white' : 'var(--color-text-primary)',
                  backgroundColor: today ? 'var(--color-today)' : 'transparent',
                  fontWeight: today ? 600 : 400,
                }}
              >
                {dayDate.getDate()}
              </span>
              {dotColor && isCurrentMonth && (
                <div
                  className="absolute bottom-0 w-1 h-1 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function YearView({ year }: YearViewProps) {
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="grid grid-cols-4 gap-4 max-w-6xl mx-auto">
        {months.map((month) => (
          <MiniMonth key={month.getMonth()} date={month} />
        ))}
      </div>
    </div>
  );
}
