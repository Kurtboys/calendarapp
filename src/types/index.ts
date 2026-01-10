export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type ViewType = 'today' | '3day' | '5day' | '7day' | '30day' | 'year';

export interface Task {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  priority: Priority;
  date: string; // ISO date string (YYYY-MM-DD)
  order: number; // for drag-and-drop ordering within a day
  completed: boolean;
  createdAt: string;
}

export interface DayData {
  date: Date;
  dateString: string;
  isToday: boolean;
  isCurrentMonth: boolean;
  tasks: Task[];
}
