import { useState } from 'react';
import type { Goal } from '../types';
import { formatDuration } from '../utils/date';

interface GoalBlockProps {
  goal: Goal;
  index: number;
  onClick: () => void;
  onDelete: (id: string) => void;
  onToggleRepeating?: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

export function GoalBlock({
  goal,
  index,
  onClick,
  onDelete,
  onToggleRepeating,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: GoalBlockProps) {
  const [showDelete, setShowDelete] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger click when dragging
    if (e.defaultPrevented) return;
    onClick();
  };

  return (
    <div
      draggable
      onClick={handleClick}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(e, index);
      }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={`relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
        isDragging ? 'opacity-50 scale-95' : ''
      } ${isDragOver ? 'translate-y-1' : ''}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `2px solid ${isDragOver ? 'var(--color-accent)' : 'var(--color-border)'}`,
      }}
    >
      {/* Order number */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
        style={{
          backgroundColor: 'var(--color-accent-light)',
          color: 'var(--color-accent)',
        }}
      >
        {index + 1}
      </div>

      {/* Play icon */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:scale-110"
        style={{
          backgroundColor: 'var(--color-accent)',
        }}
      >
        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="font-medium"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {goal.title}
        </p>
        <p
          className="text-sm"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          Click to start timer
        </p>
      </div>

      {/* Repeat button */}
      {onToggleRepeating && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleRepeating(goal.id);
          }}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{
            backgroundColor: goal.isRepeating ? 'var(--color-accent)' : 'var(--color-surface)',
            color: goal.isRepeating ? 'white' : 'var(--color-text-tertiary)',
            border: goal.isRepeating ? 'none' : '1px solid var(--color-border)',
          }}
          title={goal.isRepeating ? 'Repeats daily (click to stop)' : 'Click to repeat daily'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Duration badge */}
      <div
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-semibold"
        style={{
          backgroundColor: 'var(--color-accent-light)',
          color: 'var(--color-accent)',
        }}
      >
        {formatDuration(goal.duration)}
      </div>

      {/* Delete button */}
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(goal.id);
          }}
          className="absolute -right-2 -top-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:scale-110"
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

      {/* Drag handle */}
      <div
        className="flex-shrink-0 flex flex-col gap-0.5 cursor-grab active:cursor-grabbing"
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
