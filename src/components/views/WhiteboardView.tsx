import { useState, useCallback, useRef, useEffect } from 'react';
import { useDayStart } from '../../context/DayStartContext';
import { formatDuration } from '../../utils/date';
import type { Mission, Checkpoint } from '../../types';

interface Position {
  x: number;
  y: number;
}

interface StickyNote {
  id: string;
  text: string;
  position: Position;
  color: 'yellow' | 'pink' | 'blue' | 'green';
}

interface Document {
  id: string;
  title: string;
  content: string;
  position: Position;
}

interface WhiteboardState {
  stickyNotes: StickyNote[];
  documents: Document[];
}

// Clock component showing mission time
function MissionClock({ mission, isActive }: { mission: Mission; isActive: boolean }) {
  const minutes = mission.duration;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center relative"
      style={{
        backgroundColor: isActive ? 'var(--color-accent)' : 'var(--color-surface)',
        border: `3px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
        boxShadow: isActive ? '0 0 20px var(--color-accent)' : '0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      {/* Clock face marks */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <div
          key={i}
          className="absolute w-0.5 h-2"
          style={{
            backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'var(--color-border)',
            transform: `rotate(${i * 30}deg) translateY(-32px)`,
          }}
        />
      ))}
      <div className="text-center">
        <span
          className="text-lg font-bold"
          style={{ color: isActive ? 'white' : 'var(--color-text-primary)' }}
        >
          {hours > 0 ? `${hours}h` : ''}{mins > 0 ? `${mins}m` : ''}
        </span>
      </div>
    </div>
  );
}

// Arrow connector between nodes
function Arrow({ from, to, isCompleted }: { from: Position; to: Position; isCompleted: boolean }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const length = Math.sqrt(dx * dx + dy * dy);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: from.x,
        top: from.y,
        width: length,
        height: 2,
        backgroundColor: isCompleted ? 'var(--color-priority-low)' : 'var(--color-border)',
        transform: `rotate(${angle}deg)`,
        transformOrigin: '0 50%',
      }}
    >
      {/* Arrow head */}
      <div
        className="absolute right-0 top-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid',
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderLeftColor: isCompleted ? 'var(--color-priority-low)' : 'var(--color-border)',
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  );
}

// Checkpoint node
function CheckpointNode({
  checkpoint,
  index,
  isActive,
  isCompleted,
  isLocked,
  onClick,
}: {
  checkpoint: Checkpoint;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isLocked: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={`relative p-3 rounded-xl transition-all ${isLocked ? 'opacity-40' : 'cursor-pointer hover:scale-105'}`}
      style={{
        backgroundColor: isCompleted
          ? 'var(--color-priority-low)'
          : isActive
            ? 'var(--color-accent)'
            : 'var(--color-surface)',
        border: `2px solid ${isCompleted ? 'var(--color-priority-low)' : isActive ? 'var(--color-accent)' : 'var(--color-border)'}`,
        minWidth: 180,
        boxShadow: isActive ? '0 4px 20px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
          style={{
            backgroundColor: isCompleted || isActive ? 'rgba(255,255,255,0.2)' : 'var(--color-background)',
            color: isCompleted || isActive ? 'white' : 'var(--color-text-secondary)',
          }}
        >
          {isCompleted ? '✓' : index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium truncate"
            style={{ color: isCompleted || isActive ? 'white' : 'var(--color-text-primary)' }}
          >
            {checkpoint.title}
          </p>
          <p
            className="text-xs"
            style={{ color: isCompleted || isActive ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)' }}
          >
            {formatDuration(checkpoint.duration)}
          </p>
        </div>
      </div>
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Mission block with clock and checkpoints
function MissionBlock({
  mission,
  position,
  isCurrentMission,
  isLocked,
  isUnlocking,
  onCheckpointClick,
}: {
  mission: Mission;
  position: Position;
  isCurrentMission: boolean;
  isLocked: boolean;
  isUnlocking: boolean;
  onCheckpointClick: (checkpointId: string) => void;
}) {
  const currentCheckpointIndex = mission.currentCheckpointIndex;

  return (
    <div
      className={`absolute transition-all duration-500 ${isUnlocking ? 'animate-pulse' : ''}`}
      style={{
        left: position.x,
        top: position.y,
        opacity: isLocked ? 0.3 : 1,
        transform: isUnlocking ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {/* Mission header with clock */}
      <div
        className="p-4 rounded-2xl mb-4"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: `2px solid ${isCurrentMission ? 'var(--color-accent)' : 'var(--color-border)'}`,
          boxShadow: isCurrentMission ? '0 8px 32px rgba(0,0,0,0.2)' : '0 4px 16px rgba(0,0,0,0.1)',
          minWidth: 240,
        }}
      >
        <div className="flex items-center gap-4">
          <MissionClock mission={mission} isActive={isCurrentMission} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  backgroundColor: isCurrentMission ? 'var(--color-accent)' : 'var(--color-accent-light)',
                  color: isCurrentMission ? 'white' : 'var(--color-accent)',
                }}
              >
                Mission {mission.missionNumber}
              </span>
            </div>
            <h3
              className="font-semibold text-lg"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {mission.title}
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              {mission.checkpoints.filter(cp => cp.completed).length}/{mission.checkpoints.length} checkpoints
            </p>
          </div>
        </div>
      </div>

      {/* Checkpoints flowing down */}
      <div className="space-y-3 pl-8">
        {mission.checkpoints.map((checkpoint, idx) => {
          const isActive = isCurrentMission && idx === currentCheckpointIndex;
          const isCompleted = checkpoint.completed;
          const checkpointLocked = isLocked || (!isCurrentMission && !isCompleted);

          return (
            <div key={checkpoint.id} className="relative">
              {/* Vertical connector line */}
              {idx > 0 && (
                <div
                  className="absolute left-1/2 -top-3 w-0.5 h-3"
                  style={{
                    backgroundColor: mission.checkpoints[idx - 1].completed
                      ? 'var(--color-priority-low)'
                      : 'var(--color-border)',
                  }}
                />
              )}
              <CheckpointNode
                checkpoint={checkpoint}
                index={idx}
                isActive={isActive}
                isCompleted={isCompleted}
                isLocked={checkpointLocked}
                onClick={() => onCheckpointClick(checkpoint.id)}
              />
            </div>
          );
        })}
      </div>

      {/* Lock overlay for locked missions */}
      {isLocked && (
        <div
          className="absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-border)' }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-text-tertiary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Sticky note component
function StickyNoteComponent({
  note,
  onUpdate,
  onDelete,
  onDragEnd,
}: {
  note: StickyNote;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  onDragEnd: (position: Position) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const noteRef = useRef<HTMLDivElement>(null);

  const colors = {
    yellow: '#FEF3C7',
    pink: '#FCE7F3',
    blue: '#DBEAFE',
    green: '#D1FAE5',
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - note.position.x, y: e.clientY - note.position.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    if (noteRef.current) {
      noteRef.current.style.left = `${newX}px`;
      noteRef.current.style.top = `${newY}px`;
    }
  }, [isDragging]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragEnd({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, [isDragging, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={noteRef}
      className={`absolute w-48 p-3 rounded-lg shadow-lg cursor-move transition-shadow ${isDragging ? 'shadow-xl z-50' : ''}`}
      style={{
        left: note.position.x,
        top: note.position.y,
        backgroundColor: colors[note.color],
        transform: 'rotate(-2deg)',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => setIsEditing(true)}
    >
      <button
        onClick={onDelete}
        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
      >
        ×
      </button>
      {isEditing ? (
        <textarea
          autoFocus
          value={note.text}
          onChange={(e) => onUpdate(e.target.value)}
          onBlur={() => setIsEditing(false)}
          className="w-full h-24 bg-transparent resize-none focus:outline-none text-sm"
          style={{ color: '#1F2937' }}
        />
      ) : (
        <p className="text-sm whitespace-pre-wrap" style={{ color: '#1F2937' }}>
          {note.text || 'Double-click to edit...'}
        </p>
      )}
    </div>
  );
}

// Document component
function DocumentComponent({
  doc,
  onUpdate,
  onDelete,
  onDragEnd,
}: {
  doc: Document;
  onUpdate: (title: string, content: string) => void;
  onDelete: () => void;
  onDragEnd: (position: Position) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const dragStart = useRef<Position>({ x: 0, y: 0 });
  const docRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isExpanded) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - doc.position.x, y: e.clientY - doc.position.y };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    if (docRef.current) {
      docRef.current.style.left = `${newX}px`;
      docRef.current.style.top = `${newY}px`;
    }
  }, [isDragging]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    onDragEnd({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, [isDragging, onDragEnd]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      ref={docRef}
      className={`absolute rounded-xl shadow-lg transition-all ${isDragging ? 'shadow-xl z-50' : ''} ${isExpanded ? 'w-96' : 'w-56'}`}
      style={{
        left: doc.position.x,
        top: doc.position.y,
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b cursor-move"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-text-tertiary)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {isExpanded ? (
            <input
              value={doc.title}
              onChange={(e) => onUpdate(e.target.value, doc.content)}
              className="text-sm font-medium bg-transparent focus:outline-none"
              style={{ color: 'var(--color-text-primary)' }}
            />
          ) : (
            <span className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
              {doc.title || 'Untitled'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-black/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-text-tertiary)' }}>
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded hover:bg-red-100"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-3">
          <textarea
            value={doc.content}
            onChange={(e) => onUpdate(doc.title, e.target.value)}
            placeholder="Start writing..."
            className="w-full h-48 bg-transparent resize-none focus:outline-none text-sm"
            style={{ color: 'var(--color-text-primary)' }}
          />
        </div>
      )}
    </div>
  );
}

export function WhiteboardView() {
  const {
    getAssignedMissions,
    getCurrentMission,
  } = useDayStart();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<Position>({ x: 0, y: 0 });

  const [whiteboardState, setWhiteboardState] = useState<WhiteboardState>(() => {
    const saved = localStorage.getItem('whiteboard-state');
    return saved ? JSON.parse(saved) : { stickyNotes: [], documents: [] };
  });

  const [unlockingMissionId, _setUnlockingMissionId] = useState<string | null>(null);

  const assignedMissions = getAssignedMissions();
  const currentMission = getCurrentMission();

  // Save whiteboard state
  useEffect(() => {
    localStorage.setItem('whiteboard-state', JSON.stringify(whiteboardState));
  }, [whiteboardState]);

  // Auto-pan to current mission
  useEffect(() => {
    if (currentMission && canvasRef.current) {
      const missionIndex = assignedMissions.findIndex(m => m.id === currentMission.id);
      if (missionIndex >= 0) {
        const targetX = -(missionIndex * 400) + 100;
        setPan({ x: targetX, y: 50 });
      }
    }
  }, [currentMission?.id]);

  // Calculate mission positions (horizontal layout)
  const getMissionPosition = (index: number): Position => ({
    x: index * 400 + 50,
    y: 50,
  });

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    });
  }, [isPanning]);

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Pan handler (trackpad/scroll wheel)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setPan(p => ({
      x: p.x - e.deltaX,
      y: p.y - e.deltaY,
    }));
  }, []);

  // Keyboard zoom handler (arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setZoom(z => Math.min(z + 0.1, 2));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setZoom(z => Math.max(z - 0.1, 0.25));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add sticky note
  const addStickyNote = (color: StickyNote['color']) => {
    const viewportCenter = canvasRef.current?.getBoundingClientRect();
    const x = viewportCenter ? (viewportCenter.width / 2 - pan.x) / zoom : 300;
    const y = viewportCenter ? (viewportCenter.height / 2 - pan.y) / zoom : 300;

    const newNote: StickyNote = {
      id: Date.now().toString(),
      text: '',
      position: { x, y },
      color,
    };
    setWhiteboardState(prev => ({
      ...prev,
      stickyNotes: [...prev.stickyNotes, newNote],
    }));
  };

  // Add document
  const addDocument = () => {
    const viewportCenter = canvasRef.current?.getBoundingClientRect();
    const x = viewportCenter ? (viewportCenter.width / 2 - pan.x) / zoom : 400;
    const y = viewportCenter ? (viewportCenter.height / 2 - pan.y) / zoom : 300;

    const newDoc: Document = {
      id: Date.now().toString(),
      title: 'New Document',
      content: '',
      position: { x, y },
    };
    setWhiteboardState(prev => ({
      ...prev,
      documents: [...prev.documents, newDoc],
    }));
  };

  // Update sticky note
  const updateStickyNote = (id: string, text: string) => {
    setWhiteboardState(prev => ({
      ...prev,
      stickyNotes: prev.stickyNotes.map(n => n.id === id ? { ...n, text } : n),
    }));
  };

  // Delete sticky note
  const deleteStickyNote = (id: string) => {
    setWhiteboardState(prev => ({
      ...prev,
      stickyNotes: prev.stickyNotes.filter(n => n.id !== id),
    }));
  };

  // Move sticky note
  const moveStickyNote = (id: string, position: Position) => {
    setWhiteboardState(prev => ({
      ...prev,
      stickyNotes: prev.stickyNotes.map(n => n.id === id ? { ...n, position } : n),
    }));
  };

  // Update document
  const updateDocument = (id: string, title: string, content: string) => {
    setWhiteboardState(prev => ({
      ...prev,
      documents: prev.documents.map(d => d.id === id ? { ...d, title, content } : d),
    }));
  };

  // Delete document
  const deleteDocument = (id: string) => {
    setWhiteboardState(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id),
    }));
  };

  // Move document
  const moveDocument = (id: string, position: Position) => {
    setWhiteboardState(prev => ({
      ...prev,
      documents: prev.documents.map(d => d.id === id ? { ...d, position } : d),
    }));
  };

  // Handle checkpoint click (placeholder for now)
  const handleCheckpointClick = (missionId: string, checkpointId: string) => {
    console.log('Checkpoint clicked:', missionId, checkpointId);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Add:
          </span>

          {/* Sticky note colors */}
          <button
            onClick={() => addStickyNote('yellow')}
            className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
            style={{ backgroundColor: '#FEF3C7', border: '2px solid #F59E0B' }}
            title="Yellow sticky note"
          />
          <button
            onClick={() => addStickyNote('pink')}
            className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
            style={{ backgroundColor: '#FCE7F3', border: '2px solid #EC4899' }}
            title="Pink sticky note"
          />
          <button
            onClick={() => addStickyNote('blue')}
            className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
            style={{ backgroundColor: '#DBEAFE', border: '2px solid #3B82F6' }}
            title="Blue sticky note"
          />
          <button
            onClick={() => addStickyNote('green')}
            className="w-8 h-8 rounded-lg transition-transform hover:scale-110"
            style={{ backgroundColor: '#D1FAE5', border: '2px solid #10B981' }}
            title="Green sticky note"
          />

          <div className="w-px h-6 mx-2" style={{ backgroundColor: 'var(--color-border)' }} />

          {/* Document button */}
          <button
            onClick={addDocument}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Document
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.max(z - 0.1, 0.25))}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-sm font-medium w-12 text-center" style={{ color: 'var(--color-text-secondary)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
            className="p-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => { setZoom(1); setPan({ x: 0, y: 50 }); }}
            className="px-3 py-1.5 rounded-lg text-sm transition-colors"
            style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)' }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden cursor-grab canvas-bg"
        style={{
          backgroundColor: 'var(--color-background)',
          backgroundImage: `
            radial-gradient(circle, var(--color-border) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Mission arrows connecting missions horizontally */}
          {assignedMissions.map((_mission, idx) => {
            if (idx === 0) return null;
            const fromPos = getMissionPosition(idx - 1);
            const toPos = getMissionPosition(idx);
            const prevMission = assignedMissions[idx - 1];
            const isCompleted = prevMission.completed || prevMission.checkpoints.every(cp => cp.completed);

            return (
              <Arrow
                key={`arrow-${idx}`}
                from={{ x: fromPos.x + 280, y: fromPos.y + 60 }}
                to={{ x: toPos.x - 20, y: toPos.y + 60 }}
                isCompleted={isCompleted}
              />
            );
          })}

          {/* Mission blocks */}
          {assignedMissions.map((mission, idx) => {
            const position = getMissionPosition(idx);
            const isCurrentMission = currentMission?.id === mission.id;
            const currentMissionIndex = currentMission
              ? assignedMissions.findIndex(m => m.id === currentMission.id)
              : 0;
            const isLocked = idx > currentMissionIndex && !mission.completed;
            const isUnlocking = unlockingMissionId === mission.id;

            return (
              <MissionBlock
                key={mission.id}
                mission={mission}
                position={position}
                isCurrentMission={isCurrentMission}
                isLocked={isLocked}
                isUnlocking={isUnlocking}
                onCheckpointClick={(cpId) => handleCheckpointClick(mission.id, cpId)}
              />
            );
          })}

          {/* Sticky notes */}
          {whiteboardState.stickyNotes.map(note => (
            <StickyNoteComponent
              key={note.id}
              note={note}
              onUpdate={(text) => updateStickyNote(note.id, text)}
              onDelete={() => deleteStickyNote(note.id)}
              onDragEnd={(pos) => moveStickyNote(note.id, pos)}
            />
          ))}

          {/* Documents */}
          {whiteboardState.documents.map(doc => (
            <DocumentComponent
              key={doc.id}
              doc={doc}
              onUpdate={(title, content) => updateDocument(doc.id, title, content)}
              onDelete={() => deleteDocument(doc.id)}
              onDragEnd={(pos) => moveDocument(doc.id, pos)}
            />
          ))}

          {/* Empty state */}
          {assignedMissions.length === 0 && (
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center p-8 rounded-2xl"
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '2px dashed var(--color-border)',
              }}
            >
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <h3
                className="text-xl font-semibold mb-2"
                style={{ color: 'var(--color-text-primary)' }}
              >
                No missions scheduled
              </h3>
              <p style={{ color: 'var(--color-text-tertiary)' }}>
                Schedule missions in the Today view to see them here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mini-map / Legend */}
      <div
        className="absolute bottom-4 left-4 p-3 rounded-xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="text-xs space-y-1" style={{ color: 'var(--color-text-tertiary)' }}>
          <p>Scroll to pan • Arrow keys to zoom</p>
          <p>Double-click notes to edit</p>
        </div>
      </div>
    </div>
  );
}
