import { BREAKDOWN_LEVELS, type BreakdownLevel } from '../../types';

interface BreakdownLevelSelectorProps {
  selectedLevel: BreakdownLevel;
  onSelectLevel: (level: BreakdownLevel) => void;
}

export function BreakdownLevelSelector({ selectedLevel, onSelectLevel }: BreakdownLevelSelectorProps) {
  const levels: BreakdownLevel[] = [1, 2, 3, 4, 5];

  return (
    <div className="space-y-2">
      <p
        className="text-sm font-medium"
        style={{ color: 'var(--color-text-primary)' }}
      >
        How detailed should the breakdown be?
      </p>

      {/* Visual slider */}
      <div className="flex items-center gap-1 mb-3">
        {levels.map((level) => (
          <button
            key={level}
            onClick={() => onSelectLevel(level)}
            className="flex-1 h-2 rounded-full transition-all"
            style={{
              backgroundColor: level <= selectedLevel
                ? 'var(--color-accent)'
                : 'var(--color-border)',
            }}
          />
        ))}
      </div>

      {/* Level options */}
      <div className="space-y-2">
        {levels.map((level) => {
          const info = BREAKDOWN_LEVELS[level];
          const isSelected = level === selectedLevel;

          return (
            <button
              key={level}
              onClick={() => onSelectLevel(level)}
              className="w-full p-3 rounded-xl text-left transition-all"
              style={{
                backgroundColor: isSelected
                  ? 'var(--color-accent-light)'
                  : 'var(--color-background)',
                border: isSelected
                  ? '2px solid var(--color-accent)'
                  : '1px solid var(--color-border)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className="font-semibold text-sm"
                    style={{
                      color: isSelected
                        ? 'var(--color-accent)'
                        : 'var(--color-text-primary)',
                    }}
                  >
                    {info.name}
                  </span>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    {info.description}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{
                    backgroundColor: isSelected
                      ? 'var(--color-accent)'
                      : 'var(--color-surface)',
                    color: isSelected
                      ? 'white'
                      : 'var(--color-text-tertiary)',
                  }}
                >
                  {info.checkpointRange}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
