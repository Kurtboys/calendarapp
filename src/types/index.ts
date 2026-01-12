export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type ViewType = 'today' | '3day' | 'bottleneck' | 'scheduler' | 'dynamic' | 'completed' | 'settings';

export type MissionCategory = 'need-to-do-soon' | 'can-wait' | 'sometime-future';

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
  category?: MissionCategory; // for missions list (unscheduled missions)
}

// Missions in the missions list (not yet scheduled for a specific day)
export interface MissionListItem {
  id: string;
  title: string;
  duration: number;
  checkpoints: Omit<Checkpoint, 'completed' | 'completedAt' | 'timeSpent'>[];
  category: MissionCategory;
  createdAt: string;
  order: number; // order within the category
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

// Completed mission for history
export interface CompletedMission {
  id: string;
  title: string;
  duration: number;
  timeSpent: number;
  checkpoints: Checkpoint[];
  completedAt: string; // ISO timestamp
  completedDate: string; // YYYY-MM-DD for grouping
}

// User settings
export interface UserSettings {
  defaultEndTime: number; // hour (0-23), default timeline end time
  // Future: more settings can go here
}

// Scheduled missions for future days
export interface ScheduledDay {
  date: string; // YYYY-MM-DD
  missions: Mission[];
}
