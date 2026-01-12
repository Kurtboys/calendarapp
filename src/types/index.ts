export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type ViewType = 'today' | '3day' | '5day' | '7day' | '30day' | 'year' | 'bottleneck';

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

export interface Checkpoint {
  id: string;
  title: string;
  duration: number; // in minutes (time cap for this checkpoint)
  order: number;
  completed: boolean;
  completedAt?: string; // ISO timestamp when completed
  timeSpent?: number; // actual minutes spent
}

export interface Mission {
  id: string;
  title: string;
  duration: number; // in minutes (overall time cap for mission)
  order: number;
  completed: boolean;
  completedAt?: string; // ISO timestamp when completed
  timeSpent?: number; // actual total minutes spent
  checkpoints: Checkpoint[];
  currentCheckpointIndex: number; // which checkpoint is active (0-based)
  missionNumber?: number; // 1-15, assigned position in timeline (undefined = unassigned/in sidebar)
  isRepeating?: boolean; // if true, this mission repeats daily
  repeatingMissionId?: string; // links to the RepeatingMission this was created from
  isBottleneck?: boolean; // if true, this mission is blocked
  bottleneckReason?: string; // description of what's blocking
  bottleneckDate?: string; // when it was marked as bottleneck
  parentMissionId?: string; // if this is a bottleneck-fix mission, links to the blocked mission
}

export interface RepeatingMission {
  id: string;
  title: string;
  duration: number;
  checkpoints: Omit<Checkpoint, 'id' | 'completed' | 'completedAt' | 'timeSpent'>[];
  order: number;
}

export interface DayConfig {
  date: string; // YYYY-MM-DD
  startTime: number; // hour (0-23), e.g., 7 for 7 AM
  endTime: number; // hour (0-23), e.g., 22 for 10 PM
  missions: Mission[];
  startedAt: string; // ISO timestamp when day was started
}

// Legacy type aliases for backwards compatibility during migration
export type Goal = Mission;
export type RepeatingGoal = RepeatingMission;
