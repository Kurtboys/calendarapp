import { DayColumn } from '../DayColumn';
import { getDateRange } from '../../utils/date';

interface MultiDayViewProps {
  startDate: Date;
  days: number;
}

export function MultiDayView({ startDate, days }: MultiDayViewProps) {
  const dates = getDateRange(startDate, days);
  const isCompact = days >= 5;

  return (
    <div className="h-full p-6 overflow-hidden">
      <div
        className="h-full grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))`,
        }}
      >
        {dates.map((date) => (
          <DayColumn
            key={date.toISOString()}
            date={date}
            compact={isCompact}
          />
        ))}
      </div>
    </div>
  );
}
