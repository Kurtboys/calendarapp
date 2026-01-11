import { useState } from 'react';
import type { Goal } from '../types';
import { formatDuration } from '../utils/date';

interface GoalBlockProps {
  goal: Goal;
  index: number;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

export function GoalBlock({
  goal,
  index,
  onToggleComplete,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: GoalBlockProps) {
  const [showDelete, setShowDelete] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, index);
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`relative flex items-center gap-4 p-4 rounded-xl cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDragOver ? 'translate-y-1' : ''}`}
      style={{
        backgroundColor: goal.completed ? 'var(--color-surface)' : 'var(--color-surface)',
        border: `2px solid ${isDragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
    >
      {/* Order number / Drag handle */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
        style={{
          backgroundColor: goal.completed ? 'var(--color-border)' : 'var(--color-accent-light)',
          color: goal.completed ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
        }}
      >
        {index + 1}
      </div>

      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(goal.id)}
        className="flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors"
        style={{
          borderColor: goal.completed ? 'var(--color-accent)' : 'var(--color-border)',
          backgroundColor: goal.completed ? 'var(--color-accent)' : 'transparent',
        }}
      >
        {goal.completed && (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${goal.completed ? 'line-through' : ''}`}
          style={{
            color: goal.completed ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
          }}
        >
          {goal.title}
        </p>
      </div>

      {/* Duration */}
      <div
        className="flex-shrink-0 px-3 py-1 rounded-lg text-sm font-medium"
        style={{
          backgroundColor: goal.completed ? 'var(--color-border)' : 'var(--color-accent-light)',
          color: goal.completed ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
        }}
      >
        {formatDuration(goal.duration)}
      </div>

      {/* Delete button */}
      {showDelete && (
        <button
          onClick={() => onDelete(goal.id)}
          className="absolute -right-2 -top-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors"
          style={{
            backgroundColor: 'var(--color-priority-urgent)',
            color: 'white',
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Drag indicator */}
      <div
        className="flex-shrink-0 flex flex-col gap-0.5"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        <div className="flex gap-0.5">
          <div className="w-1 h-1 rounded-full bg-current" />
          <div className="w-1 h-1 rounded-full bg-current" />
        </div>
        <div className="flex gap-0.5">
          <div className="w-1 h-1 rounded-full bg-current" />
          <div className="w-1 h-1 rounded-full bg-current" />
        </div>
        <div className="flex gap-0.5">
          <div className="w-1 h-1 rounded-full bg-current" />
          <div className="w-1 h-1 rounded-full bg-current" />
        </div>
      </div>
    </div>
  );
}
