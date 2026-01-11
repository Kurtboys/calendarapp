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

export interface Goal {
  id: string;
  title: string;
  duration: number; // in minutes (time cap)
  order: number;
  completed: boolean;
  completedAt?: string; // ISO timestamp when completed
  timeSpent?: number; // actual minutes spent
}

export interface DayConfig {
  date: string; // YYYY-MM-DD
  startTime: number; // hour (0-23), e.g., 7 for 7 AM
  endTime: number; // hour (0-23), e.g., 22 for 10 PM
  goals: Goal[];
  startedAt: string; // ISO timestamp when day was started
}
