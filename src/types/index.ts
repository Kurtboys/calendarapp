export type Priority = 'urgent' | 'high' | 'medium' | 'low' | 'none';

export type ViewType = 'today' | '3day' | 'bottleneck' | 'scheduler' | 'dynamic' | 'completed' | 'settings';

export type MissionCategory = 'need-to-do-soon' | 'can-wait' | 'sometime-future';

// Cognitive Level (1-5) - how much brain power a task requires
export type CognitiveLevel = 1 | 2 | 3 | 4 | 5;

// Minimum viable session time in minutes
export type MinimumViableSession = 15 | 30 | 45 | 60 | 90 | 120;

// Energy state for daily login
export type EnergyState = 'low' | 'normal' | 'high';

// Cognitive level definitions with feeling-based descriptions and examples
export const COGNITIVE_LEVELS: Record<CognitiveLevel, { label: string; feeling: string; examples: string[] }> = {
  5: {
    label: 'Deep Focus',
    feeling: 'Requires intense concentration - you need to be at your sharpest',
    examples: [
      'Design a new product strategy from scratch',
      'Write complex code for a new feature',
      'Solve a problem you\'ve never faced before',
    ],
  },
  4: {
    label: 'Hard But Familiar',
    feeling: 'Challenging but you know how to do it - needs solid focus',
    examples: [
      'Write a client proposal using a template',
      'Debug a tricky but familiar issue',
      'Create a presentation on a topic you know',
    ],
  },
  3: {
    label: 'Routine Work',
    feeling: 'Standard work mode - you can do this on autopilot',
    examples: [
      'Update weekly metrics spreadsheet',
      'Review and approve documents',
      'Follow a checklist or procedure',
    ],
  },
  2: {
    label: 'Light Work',
    feeling: 'Easy and quick - minimal thinking required',
    examples: [
      'Respond to simple emails',
      'Schedule meetings',
      'File or organize documents',
    ],
  },
  1: {
    label: 'Physical/Automatic',
    feeling: 'No thinking needed - can do while listening to a podcast',
    examples: [
      'Organize your desk',
      'Light stretching or walking',
      'Sort through mail',
    ],
  },
};

// Minimum viable session options
export const MVS_OPTIONS: { value: MinimumViableSession; label: string }[] = [
  { value: 15, label: 'Quick task (15 min)' },
  { value: 30, label: 'Short session (30 min)' },
  { value: 45, label: 'Medium session (45 min)' },
  { value: 60, label: 'Long session (1 hour)' },
  { value: 90, label: 'Deep work (1.5 hours)' },
  { value: 120, label: 'Extended focus (2+ hours)' },
];

// Energy state definitions
export const ENERGY_STATES: Record<EnergyState, { label: string; description: string; icon: string }> = {
  low: {
    label: 'Low Energy',
    description: 'Feeling tired or unfocused. Start with easy wins to build momentum.',
    icon: '🔋',
  },
  normal: {
    label: 'Normal Energy',
    description: 'Feeling balanced. Mix of challenging and routine tasks.',
    icon: '⚡',
  },
  high: {
    label: 'High Energy',
    description: 'Feeling sharp and focused. Tackle your hardest work first.',
    icon: '🚀',
  },
};

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
  // Classification fields (required for new missions)
  cognitiveLevel: CognitiveLevel; // 1-5, how much brain power required
  minimumViableSession: MinimumViableSession; // minimum time needed to make progress
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
  // Classification fields (required)
  cognitiveLevel: CognitiveLevel;
  minimumViableSession: MinimumViableSession;
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
  cognitiveLevel: CognitiveLevel;
  minimumViableSession: MinimumViableSession;
}

// Mission recommendation for reordering
export interface MissionRecommendation {
  missionId: string;
  mission: Mission;
  originalOrder: number;
  recommendedOrder: number;
  reason: string;
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

// ============================================
// AI Breakdown Feature Types
// ============================================

// Breakdown detail levels
export type BreakdownLevel = 1 | 2 | 3 | 4 | 5;

export const BREAKDOWN_LEVELS: Record<BreakdownLevel, { name: string; description: string; checkpointRange: string }> = {
  1: {
    name: 'High-Level Overview',
    description: 'Just the big chunks',
    checkpointRange: '3-5 steps',
  },
  2: {
    name: 'Key Milestones',
    description: 'The main deliverables',
    checkpointRange: '5-8 steps',
  },
  3: {
    name: 'Standard Checklist',
    description: 'A normal to-do list',
    checkpointRange: '8-12 steps',
  },
  4: {
    name: 'Granular Detail',
    description: 'Leaves no room for ambiguity',
    checkpointRange: '12-20 steps',
  },
  5: {
    name: 'Atomic Instructions',
    description: 'Literal, mechanical actions: "Open laptop," "Click file"',
    checkpointRange: '20+ steps',
  },
};

// Context question with multiple choice answers
export interface ContextQuestion {
  id: string;
  question: string;
  options: string[]; // 3 options
  allowMultiple: boolean; // if true, show "All of the above" option
}

// User's answers to context questions
export interface ContextAnswer {
  questionId: string;
  selectedOptions: number[]; // indices of selected options (can be multiple if "all of the above")
}

// Generated checkpoint from AI
export interface GeneratedCheckpoint {
  title: string;
  estimatedMinutes: number;
  cognitiveLevel: CognitiveLevel;
  reasoning?: string; // why this time estimate
}

// AI breakdown request
export interface BreakdownRequest {
  taskTitle: string;
  breakdownLevel: BreakdownLevel;
  contextAnswers: ContextAnswer[];
  userTimeHistory?: TaskTimeHistory[]; // for personalized estimates
}

// AI breakdown response
export interface BreakdownResponse {
  checkpoints: GeneratedCheckpoint[];
  totalEstimatedMinutes: number;
  suggestedCognitiveLevel: CognitiveLevel;
  suggestedMVS: MinimumViableSession;
}

// Time tracking for learning
export interface TaskTimeHistory {
  id: string;
  taskKeywords: string[]; // extracted keywords from task title
  taskType: string; // AI-categorized type (e.g., "design", "coding", "meeting")
  cognitiveLevel: CognitiveLevel;
  estimatedMinutes: number;
  actualMinutes: number;
  accuracy: number; // actualMinutes / estimatedMinutes (1.0 = perfect)
  completedAt: string;
}

// AI Settings
export interface AISettings {
  apiKey?: string; // Anthropic API key
  enabled: boolean;
  model: 'claude-3-haiku-20240307' | 'claude-sonnet-4-20250514';
}

// Breakdown flow state
export interface BreakdownFlowState {
  step: 'context-questions' | 'generating' | 'review';
  taskTitle: string;
  breakdownLevel: BreakdownLevel;
  questions?: ContextQuestion[];
  answers?: ContextAnswer[];
  result?: BreakdownResponse;
  error?: string;
}
