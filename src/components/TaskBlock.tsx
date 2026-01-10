import type { Task, Priority } from '../types';
import { formatDuration } from '../utils/date';
import { useTasks } from '../context/TaskContext';

interface TaskBlockProps {
  task: Task;
  compact?: boolean;
}

const priorityColors: Record<Priority, string> = {
  urgent: 'var(--color-priority-urgent)',
  high: 'var(--color-priority-high)',
  medium: 'var(--color-priority-medium)',
  low: 'var(--color-priority-low)',
  none: 'var(--color-priority-none)',
};

const priorityLabels: Record<Priority, string> = {
  urgent: 'Urgent',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  none: 'No priority',
};

export function TaskBlock({ task, compact = false }: TaskBlockProps) {
  const { updateTask, deleteTask } = useTasks();
  const color = priorityColors[task.priority];

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateTask(task.id, { completed: !task.completed });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTask(task.id);
  };

  // Calculate height based on duration (min 40px, max 200px)
  const height = compact ? 'auto' : Math.min(200, Math.max(40, task.duration * 1.2));

  return (
    <div
      className="group relative rounded-lg transition-all duration-150 hover:shadow-md cursor-pointer"
      style={{
        backgroundColor: task.completed ? 'var(--color-surface)' : 'var(--color-surface)',
        borderLeft: `3px solid ${color}`,
        height: compact ? 'auto' : height,
        opacity: task.completed ? 0.6 : 1,
      }}
    >
      <div className="p-3 h-full flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={handleToggleComplete}
              className="flex-shrink-0 w-4 h-4 rounded border-2 transition-colors flex items-center justify-center"
              style={{
                borderColor: color,
                backgroundColor: task.completed ? color : 'transparent',
              }}
            >
              {task.completed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span
              className="font-medium text-sm truncate"
              style={{
                color: 'var(--color-text-primary)',
                textDecoration: task.completed ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${color}20`,
                color: color,
              }}
            >
              {formatDuration(task.duration)}
            </span>
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {!compact && task.description && (
          <p
            className="mt-1 text-xs line-clamp-2"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {task.description}
          </p>
        )}
        {!compact && (
          <div className="mt-auto pt-2">
            <span
              className="text-xs"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {priorityLabels[task.priority]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
