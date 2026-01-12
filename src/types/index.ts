export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type ViewType = 'today' | '3day' | 'bottleneck' | 'scheduler' | 'dynamic';

export interface DynamicViewConfig {
  label: string;
  days: number;
  startDate: Date;
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
  scheduledDate?: string; // YYYY-MM-DD for scheduling on future days
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
