import { DayColumn } from '../DayColumn';

interface TodayViewProps {
  date: Date;
}

export function TodayView({ date }: TodayViewProps) {
  return (
    <div className="h-full p-6">
      <div className="max-w-2xl mx-auto h-full">
        <DayColumn date={date} />
      </div>
    </div>
  );
}
