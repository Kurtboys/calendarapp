import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { DayConfig, Mission, Checkpoint, MissionListItem, MissionCategory, CompletedMission, UserSettings, ScheduledDay, CognitiveLevel, MinimumViableSession, EnergyState, MissionRecommendation } from '../types';
import { COGNITIVE_LEVELS } from '../types';
import { formatDate, addDays, getCurrentHour, getEffectiveDate } from '../utils/date';

type AppStep = 'home' | 'energy-selection' | 'recommendations' | 'logged-in' | 'logout-flow';

interface ActiveMissionState {
  missionId: string;
  checkpointId: string | null;
  startedAt: number;
  timeCap: number;
}

interface LogoutFlowState {
  step: 'unfinished-missions' | 'plan-tomorrow';
  unfinishedMissions: Mission[];
  currentIndex: number;
}

interface LoginFlowState {
  step: 'energy-selection' | 'recommendations';
  energyState?: EnergyState;
  recommendations?: MissionRecommendation[];
  pendingDayConfig?: DayConfig;
}

interface DayStartContextType {
  // App state
  appStep: AppStep;
  dayConfig: DayConfig | null;
  activeMission: ActiveMissionState | null;
  logoutFlow: LogoutFlowState | null;
  loginFlow: LoginFlowState | null;

  // Missions list (unscheduled missions by category)
  missionsList: MissionListItem[];

  // Scheduled days (future days with missions)
  scheduledDays: ScheduledDay[];

  // Completed missions history
  completedMissions: CompletedMission[];

  // Bottlenecked missions
  bottleneckedMissions: Mission[];

  // User settings
  userSettings: UserSettings;

  // Login/Logout flow
  startLoginFlow: () => void;
  selectEnergyState: (energy: EnergyState) => void;
  applyRecommendations: () => void;
  skipRecommendations: () => void;
  startLogout: () => void;
  handleUnfinishedMission: (missionId: string, action: 'tomorrow' | 'missions-list', category?: MissionCategory) => void;
  skipPlanTomorrow: () => void;
  finishLogout: () => void;
  getTomorrowDate: () => string;

  // Mission management (for today)
  addMission: (title: string, duration: number, cognitiveLevel: CognitiveLevel, minimumViableSession: MinimumViableSession) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  assignMissionNumber: (missionId: string, number: number | undefined) => void;

  // Missions list management
  addToMissionsList: (title: string, duration: number, category: MissionCategory, cognitiveLevel: CognitiveLevel, minimumViableSession: MinimumViableSession) => void;
  updateMissionListItem: (id: string, updates: Partial<MissionListItem>) => void;
  deleteMissionListItem: (id: string) => void;
  moveMissionListItemToCategory: (id: string, category: MissionCategory) => void;
  scheduleMissionFromList: (listItemId: string, date: string) => void;

  // Scheduled days management
  addMissionToDay: (date: string, title: string, duration: number, cognitiveLevel: CognitiveLevel, minimumViableSession: MinimumViableSession, checkpoints?: { title: string; duration: number }[]) => string;
  getMissionsForDay: (date: string) => Mission[];
  moveMissionToDay: (missionId: string, fromDate: string, toDate: string) => void;

  // Checkpoint management
  addCheckpoint: (missionId: string, title: string, duration: number) => void;
  updateCheckpoint: (missionId: string, checkpointId: string, updates: Partial<Checkpoint>) => void;
  deleteCheckpoint: (missionId: string, checkpointId: string) => void;
  addCheckpointToListItem: (listItemId: string, title: string, duration: number) => void;
  deleteCheckpointFromListItem: (listItemId: string, checkpointIndex: number) => void;

  // Active mission management
  startMission: (missionId: string) => void;
  completeCurrentCheckpoint: () => void;
  completeMission: () => void;
  cancelActiveMission: () => void;
  updateTimeCap: (minutes: number) => void;

  // Bottleneck management
  reportBottleneck: (reason: string, impedesProgress: boolean) => void;
  resolveBottleneck: (missionId: string) => void;

  // Settings
  updateSettings: (updates: Partial<UserSettings>) => void;

  // Get current mission/checkpoint
  getCurrentMission: () => Mission | null;
  getCurrentCheckpoint: () => Checkpoint | null;
  getAssignedMissions: () => Mission[];
  getUnassignedMissions: () => Mission[];

  // Briefing data for home page
  getBriefingData: () => {
    todayMissions: Mission[];
    totalCheckpoints: number;
    carriedOver: Mission[];
  };
}

const DayStartContext = createContext<DayStartContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  dayConfig: 'dayConfig',
  activeMission: 'activeMission',
  missionsList: 'missionsList',
  scheduledDays: 'scheduledDays',
  completedMissions: 'completedMissions',
  bottleneckedMissions: 'bottleneckedMissions',
  userSettings: 'userSettings',
  carriedOverMissions: 'carriedOverMissions',
  lastSession: 'lastSession', // Preserves session for same-day re-login
};

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  defaultEndTime: 2, // 2 AM next day
};

// Storage helpers
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function DayStartProvider({ children }: { children: ReactNode }) {
  const [dayConfig, setDayConfig] = useState<DayConfig | null>(() => loadFromStorage(STORAGE_KEYS.dayConfig, null));
  const [activeMission, setActiveMission] = useState<ActiveMissionState | null>(() => loadFromStorage(STORAGE_KEYS.activeMission, null));
  const [missionsList, setMissionsList] = useState<MissionListItem[]>(() => loadFromStorage(STORAGE_KEYS.missionsList, []));
  const [scheduledDays, setScheduledDays] = useState<ScheduledDay[]>(() => loadFromStorage(STORAGE_KEYS.scheduledDays, []));
  const [completedMissions, setCompletedMissions] = useState<CompletedMission[]>(() => loadFromStorage(STORAGE_KEYS.completedMissions, []));
  const [bottleneckedMissions, setBottleneckedMissions] = useState<Mission[]>(() => loadFromStorage(STORAGE_KEYS.bottleneckedMissions, []));
  const [userSettings, setUserSettings] = useState<UserSettings>(() => loadFromStorage(STORAGE_KEYS.userSettings, DEFAULT_SETTINGS));
  const [carriedOverMissions, setCarriedOverMissions] = useState<Mission[]>(() => loadFromStorage(STORAGE_KEYS.carriedOverMissions, []));
  const [logoutFlow, setLogoutFlow] = useState<LogoutFlowState | null>(null);
  const [loginFlow, setLoginFlow] = useState<LoginFlowState | null>(null);

  // Determine app step
  const getAppStep = (): AppStep => {
    if (logoutFlow) return 'logout-flow';
    if (loginFlow) {
      return loginFlow.step === 'energy-selection' ? 'energy-selection' : 'recommendations';
    }
    if (dayConfig) return 'logged-in';
    return 'home';
  };

  const [appStep, setAppStep] = useState<AppStep>(getAppStep);

  // Update app step when dependencies change
  useEffect(() => {
    setAppStep(getAppStep());
  }, [dayConfig, logoutFlow, loginFlow]);

  // Get tomorrow based on login day (not clock)
  const getTomorrowDate = useCallback((): string => {
    if (dayConfig) {
      // Tomorrow is the day after the logged-in day
      const loginDate = new Date(dayConfig.date + 'T12:00:00');
      return formatDate(addDays(loginDate, 1));
    }
    // If not logged in, tomorrow is based on current date
    return formatDate(addDays(new Date(), 1));
  }, [dayConfig]);

  // Generate recommendations based on energy state
  const generateRecommendations = useCallback((missions: Mission[], energyState: EnergyState): MissionRecommendation[] => {
    const incompleteMissions = missions.filter(m => !m.completed && !m.isBottleneck);
    if (incompleteMissions.length === 0) return [];

    let sortedMissions: Mission[];
    let reasons: Map<string, string> = new Map();

    switch (energyState) {
      case 'low':
        // State 1: Filter by MVS < 30min, sort by cognitiveLevel ASC (build momentum)
        sortedMissions = [...incompleteMissions]
          .filter(m => m.minimumViableSession <= 30)
          .sort((a, b) => a.cognitiveLevel - b.cognitiveLevel);

        // Add back longer tasks at the end
        const longerTasks = incompleteMissions.filter(m => m.minimumViableSession > 30)
          .sort((a, b) => a.cognitiveLevel - b.cognitiveLevel);
        sortedMissions = [...sortedMissions, ...longerTasks];

        sortedMissions.forEach((m, i) => {
          if (i === 0) {
            reasons.set(m.id, `Start here to build momentum - ${COGNITIVE_LEVELS[m.cognitiveLevel].label} task`);
          } else if (m.minimumViableSession <= 30) {
            reasons.set(m.id, `Quick win - only ${m.minimumViableSession} min, ${COGNITIVE_LEVELS[m.cognitiveLevel].label}`);
          } else {
            reasons.set(m.id, `Tackle later when you have energy built up`);
          }
        });
        break;

      case 'normal':
        // State 2: Mix - start with a moderately hard task, then alternate
        sortedMissions = [...incompleteMissions].sort((a, b) => {
          // Prefer level 3-4 tasks first, then easier, then hardest
          const priorityOrder = (level: number) => {
            if (level === 4) return 0;
            if (level === 3) return 1;
            if (level === 2) return 2;
            if (level === 5) return 3;
            return 4;
          };
          return priorityOrder(a.cognitiveLevel) - priorityOrder(b.cognitiveLevel);
        });

        sortedMissions.forEach((m, i) => {
          if (i === 0) {
            reasons.set(m.id, `Good starting point - ${COGNITIVE_LEVELS[m.cognitiveLevel].label}`);
          } else if (m.cognitiveLevel >= 4) {
            reasons.set(m.id, `Higher focus task - tackle when you hit your stride`);
          } else {
            reasons.set(m.id, `Balanced placement - ${COGNITIVE_LEVELS[m.cognitiveLevel].label}`);
          }
        });
        break;

      case 'high':
        // State 3: Hard first, respect MVS, breaks implied after 60-90min blocks
        sortedMissions = [...incompleteMissions].sort((a, b) => {
          // Sort by cognitive level DESC, then by MVS DESC
          if (b.cognitiveLevel !== a.cognitiveLevel) {
            return b.cognitiveLevel - a.cognitiveLevel;
          }
          return b.minimumViableSession - a.minimumViableSession;
        });

        sortedMissions.forEach((m, i) => {
          if (i === 0) {
            reasons.set(m.id, `Tackle your hardest work first while energy is peak - ${COGNITIVE_LEVELS[m.cognitiveLevel].label}`);
          } else if (m.cognitiveLevel >= 4) {
            reasons.set(m.id, `High-stakes task - capitalize on your focus`);
          } else {
            reasons.set(m.id, `Lighter task for later - ${COGNITIVE_LEVELS[m.cognitiveLevel].label}`);
          }
        });
        break;
    }

    // Create recommendations with original vs recommended order
    return sortedMissions.map((mission, newIndex) => {
      const originalIndex = incompleteMissions.findIndex(m => m.id === mission.id);
      return {
        missionId: mission.id,
        mission,
        originalOrder: originalIndex,
        recommendedOrder: newIndex,
        reason: reasons.get(mission.id) || '',
      };
    });
  }, []);

  // Start login flow - shows energy selection
  const startLoginFlow = useCallback(() => {
    const today = formatDate(getEffectiveDate());
    const startTime = getCurrentHour();

    // Check if there's a saved session from earlier today (same-day re-login)
    const lastSession = loadFromStorage<{ date: string; missions: Mission[]; savedAt: string } | null>(
      STORAGE_KEYS.lastSession,
      null
    );

    // Check if there are missions scheduled for today
    const scheduledForToday = scheduledDays.find(sd => sd.date === today);
    const todayMissions = scheduledForToday?.missions || [];

    // Include carried over missions
    let allMissions = [...carriedOverMissions, ...todayMissions];

    // If we have a saved session from today, merge those missions (with their progress)
    if (lastSession) {
      if (lastSession.date === today) {
        // Same-day re-login: restore missions with their progress
        // Get mission IDs from other sources to avoid duplicates
        const existingMissionIds = new Set(allMissions.map(m => m.id));

        // Add saved missions that aren't already included
        const savedMissionsToAdd = lastSession.missions.filter(m => !existingMissionIds.has(m.id));

        // Saved missions go first (they have progress), then new ones
        allMissions = [...savedMissionsToAdd, ...allMissions];
      }
      // Clear the saved session (whether from today or an old day)
      saveToStorage(STORAGE_KEYS.lastSession, null);
    }

    const pendingConfig: DayConfig = {
      date: today,
      startTime,
      endTime: userSettings.defaultEndTime,
      missions: allMissions,
      startedAt: new Date().toISOString(),
    };

    setLoginFlow({
      step: 'energy-selection',
      pendingDayConfig: pendingConfig,
    });
  }, [scheduledDays, carriedOverMissions, userSettings.defaultEndTime]);

  // Select energy state and generate recommendations
  const selectEnergyState = useCallback((energy: EnergyState) => {
    if (!loginFlow?.pendingDayConfig) return;

    const recommendations = generateRecommendations(
      loginFlow.pendingDayConfig.missions,
      energy
    );

    // If no missions or no recommendations, skip to login
    if (recommendations.length === 0) {
      // Complete login directly
      const today = loginFlow.pendingDayConfig.date;
      const scheduledForToday = scheduledDays.find(sd => sd.date === today);

      setDayConfig(loginFlow.pendingDayConfig);
      saveToStorage(STORAGE_KEYS.dayConfig, loginFlow.pendingDayConfig);

      setCarriedOverMissions([]);
      saveToStorage(STORAGE_KEYS.carriedOverMissions, []);

      if (scheduledForToday) {
        const updated = scheduledDays.filter(sd => sd.date !== today);
        setScheduledDays(updated);
        saveToStorage(STORAGE_KEYS.scheduledDays, updated);
      }

      setLoginFlow(null);
      return;
    }

    setLoginFlow({
      ...loginFlow,
      step: 'recommendations',
      energyState: energy,
      recommendations,
    });
  }, [loginFlow, scheduledDays, generateRecommendations]);

  // Apply recommendations and complete login
  const applyRecommendations = useCallback(() => {
    if (!loginFlow?.pendingDayConfig || !loginFlow.recommendations) return;

    // Reorder missions according to recommendations
    const reorderedMissions = loginFlow.recommendations.map((rec, index) => ({
      ...rec.mission,
      order: index,
    }));

    // Keep completed and bottleneck missions as they are
    const otherMissions = loginFlow.pendingDayConfig.missions.filter(
      m => m.completed || m.isBottleneck
    );

    const finalConfig: DayConfig = {
      ...loginFlow.pendingDayConfig,
      missions: [...reorderedMissions, ...otherMissions],
    };

    const today = finalConfig.date;
    const scheduledForToday = scheduledDays.find(sd => sd.date === today);

    setDayConfig(finalConfig);
    saveToStorage(STORAGE_KEYS.dayConfig, finalConfig);

    setCarriedOverMissions([]);
    saveToStorage(STORAGE_KEYS.carriedOverMissions, []);

    if (scheduledForToday) {
      const updated = scheduledDays.filter(sd => sd.date !== today);
      setScheduledDays(updated);
      saveToStorage(STORAGE_KEYS.scheduledDays, updated);
    }

    setLoginFlow(null);
  }, [loginFlow, scheduledDays]);

  // Skip recommendations and use original order
  const skipRecommendations = useCallback(() => {
    if (!loginFlow?.pendingDayConfig) return;

    const today = loginFlow.pendingDayConfig.date;
    const scheduledForToday = scheduledDays.find(sd => sd.date === today);

    setDayConfig(loginFlow.pendingDayConfig);
    saveToStorage(STORAGE_KEYS.dayConfig, loginFlow.pendingDayConfig);

    setCarriedOverMissions([]);
    saveToStorage(STORAGE_KEYS.carriedOverMissions, []);

    if (scheduledForToday) {
      const updated = scheduledDays.filter(sd => sd.date !== today);
      setScheduledDays(updated);
      saveToStorage(STORAGE_KEYS.scheduledDays, updated);
    }

    setLoginFlow(null);
  }, [loginFlow, scheduledDays]);

  // Start logout flow
  const startLogout = useCallback(() => {
    if (!dayConfig) return;

    const unfinished = dayConfig.missions.filter(m => !m.completed && !m.isBottleneck);

    if (unfinished.length > 0) {
      setLogoutFlow({
        step: 'unfinished-missions',
        unfinishedMissions: unfinished,
        currentIndex: 0,
      });
    } else {
      setLogoutFlow({
        step: 'plan-tomorrow',
        unfinishedMissions: [],
        currentIndex: 0,
      });
    }
  }, [dayConfig]);

  // Handle unfinished mission during logout
  const handleUnfinishedMission = useCallback((missionId: string, action: 'tomorrow' | 'missions-list', category?: MissionCategory) => {
    if (!logoutFlow || !dayConfig) return;

    const mission = logoutFlow.unfinishedMissions.find(m => m.id === missionId);
    if (!mission) return;

    if (action === 'tomorrow') {
      // Move to tomorrow (carried over)
      const tomorrowDate = getTomorrowDate();
      const updatedScheduledDays = [...scheduledDays];
      const tomorrowIndex = updatedScheduledDays.findIndex(sd => sd.date === tomorrowDate);

      const missionForTomorrow: Mission = {
        ...mission,
        missionNumber: undefined, // Reset mission number
        order: 0,
      };

      if (tomorrowIndex >= 0) {
        updatedScheduledDays[tomorrowIndex].missions.push(missionForTomorrow);
      } else {
        updatedScheduledDays.push({
          date: tomorrowDate,
          missions: [missionForTomorrow],
        });
      }

      setScheduledDays(updatedScheduledDays);
      saveToStorage(STORAGE_KEYS.scheduledDays, updatedScheduledDays);
    } else if (action === 'missions-list' && category) {
      // Move to missions list
      const newListItem: MissionListItem = {
        id: crypto.randomUUID(),
        title: mission.title,
        duration: mission.duration,
        checkpoints: mission.checkpoints.map(cp => ({
          id: cp.id,
          title: cp.title,
          duration: cp.duration,
          order: cp.order,
        })),
        category,
        createdAt: new Date().toISOString(),
        order: missionsList.filter(m => m.category === category).length,
        cognitiveLevel: mission.cognitiveLevel,
        minimumViableSession: mission.minimumViableSession,
      };

      const updatedList = [...missionsList, newListItem];
      setMissionsList(updatedList);
      saveToStorage(STORAGE_KEYS.missionsList, updatedList);
    }

    // Remove the handled mission from dayConfig so it's not saved to lastSession
    // This prevents duplicates on same-day re-login
    const updatedDayConfig = {
      ...dayConfig,
      missions: dayConfig.missions.filter(m => m.id !== missionId),
    };
    setDayConfig(updatedDayConfig);
    saveToStorage(STORAGE_KEYS.dayConfig, updatedDayConfig);

    // Move to next unfinished mission or plan tomorrow
    const nextIndex = logoutFlow.currentIndex + 1;
    if (nextIndex < logoutFlow.unfinishedMissions.length) {
      setLogoutFlow({
        ...logoutFlow,
        currentIndex: nextIndex,
      });
    } else {
      setLogoutFlow({
        step: 'plan-tomorrow',
        unfinishedMissions: [],
        currentIndex: 0,
      });
    }
  }, [logoutFlow, dayConfig, scheduledDays, missionsList, getTomorrowDate]);

  // Skip planning tomorrow
  const skipPlanTomorrow = useCallback(() => {
    finishLogout();
  }, []);

  // Finish logout
  const finishLogout = useCallback(() => {
    // Save completed missions to history
    if (dayConfig) {
      const newCompleted: CompletedMission[] = dayConfig.missions
        .filter(m => m.completed)
        .map(m => ({
          id: m.id,
          title: m.title,
          duration: m.duration,
          timeSpent: m.timeSpent || 0,
          checkpoints: m.checkpoints,
          completedAt: m.completedAt || new Date().toISOString(),
          completedDate: dayConfig.date,
          cognitiveLevel: m.cognitiveLevel,
          minimumViableSession: m.minimumViableSession,
        }));

      const updatedCompleted = [...completedMissions, ...newCompleted];
      setCompletedMissions(updatedCompleted);
      saveToStorage(STORAGE_KEYS.completedMissions, updatedCompleted);

      // Save session for same-day re-login (preserve incomplete missions with progress)
      const incompleteMissions = dayConfig.missions.filter(m => !m.completed && !m.isBottleneck);
      if (incompleteMissions.length > 0) {
        // Store the session state so it can be resumed if logging back in the same day
        const sessionToSave = {
          date: dayConfig.date,
          missions: incompleteMissions,
          savedAt: new Date().toISOString(),
        };
        saveToStorage(STORAGE_KEYS.lastSession, sessionToSave);
      } else {
        // No incomplete missions, clear any previous session
        saveToStorage(STORAGE_KEYS.lastSession, null);
      }
    }

    // Clear day config
    setDayConfig(null);
    saveToStorage(STORAGE_KEYS.dayConfig, null);

    // Clear active mission
    setActiveMission(null);
    saveToStorage(STORAGE_KEYS.activeMission, null);

    // Clear logout flow
    setLogoutFlow(null);
  }, [dayConfig, completedMissions]);

  // Mission management for today
  const addMission = useCallback((title: string, duration: number, cognitiveLevel: CognitiveLevel, minimumViableSession: MinimumViableSession) => {
    if (!dayConfig) return;

    const newMission: Mission = {
      id: crypto.randomUUID(),
      title,
      duration,
      order: dayConfig.missions.filter(m => !m.completed && !m.isBottleneck).length,
      completed: false,
      checkpoints: [],
      currentCheckpointIndex: 0,
      cognitiveLevel,
      minimumViableSession,
    };

    const updated = {
      ...dayConfig,
      missions: [...dayConfig.missions, newMission],
    };
    setDayConfig(updated);
    saveToStorage(STORAGE_KEYS.dayConfig, updated);
  }, [dayConfig]);

  const updateMission = useCallback((id: string, updates: Partial<Mission>) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m => m.id === id ? { ...m, ...updates } : m),
    };
    setDayConfig(updated);
    saveToStorage(STORAGE_KEYS.dayConfig, updated);
  }, [dayConfig]);

  const deleteMission = useCallback((id: string) => {
    if (!dayConfig) return;

    if (activeMission?.missionId === id) {
      setActiveMission(null);
      saveToStorage(STORAGE_KEYS.activeMission, null);
    }

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.filter(m => m.id !== id),
    };
    setDayConfig(updated);
    saveToStorage(STORAGE_KEYS.dayConfig, updated);
  }, [dayConfig, activeMission]);

  const assignMissionNumber = useCallback((missionId: string, number: number | undefined) => {
    if (!dayConfig) return;

    let updatedMissions = dayConfig.missions;
    if (number !== undefined) {
      updatedMissions = dayConfig.missions.map(m =>
        m.missionNumber === number ? { ...m, missionNumber: undefined } : m
      );
    }

    updatedMissions = updatedMissions.map(m =>
      m.id === missionId ? { ...m, missionNumber: number } : m
    );

    const updated = { ...dayConfig, missions: updatedMissions };
    setDayConfig(updated);
    saveToStorage(STORAGE_KEYS.dayConfig, updated);
  }, [dayConfig]);

  // Missions list management
  const addToMissionsList = useCallback((title: string, duration: number, category: MissionCategory, cognitiveLevel: CognitiveLevel, minimumViableSession: MinimumViableSession) => {
    const newItem: MissionListItem = {
      id: crypto.randomUUID(),
      title,
      duration,
      checkpoints: [],
      category,
      createdAt: new Date().toISOString(),
      order: missionsList.filter(m => m.category === category).length,
      cognitiveLevel,
      minimumViableSession,
    };

    const updated = [...missionsList, newItem];
    setMissionsList(updated);
    saveToStorage(STORAGE_KEYS.missionsList, updated);
  }, [missionsList]);

  const updateMissionListItem = useCallback((id: string, updates: Partial<MissionListItem>) => {
    const updated = missionsList.map(m => m.id === id ? { ...m, ...updates } : m);
    setMissionsList(updated);
    saveToStorage(STORAGE_KEYS.missionsList, updated);
  }, [missionsList]);

  const deleteMissionListItem = useCallback((id: string) => {
    const updated = missionsList.filter(m => m.id !== id);
    setMissionsList(updated);
    saveToStorage(STORAGE_KEYS.missionsList, updated);
  }, [missionsList]);

  const moveMissionListItemToCategory = useCallback((id: string, category: MissionCategory) => {
    const updated = missionsList.map(m =>
      m.id === id ? { ...m, category, order: missionsList.filter(x => x.category === category).length } : m
    );
    setMissionsList(updated);
    saveToStorage(STORAGE_KEYS.missionsList, updated);
  }, [missionsList]);

  const scheduleMissionFromList = useCallback((listItemId: string, date: string) => {
    const listItem = missionsList.find(m => m.id === listItemId);
    if (!listItem) return;

    // Create mission from list item
    const newMission: Mission = {
      id: crypto.randomUUID(),
      title: listItem.title,
      duration: listItem.duration,
      order: 0,
      completed: false,
      checkpoints: listItem.checkpoints.map((cp) => ({
        ...cp,
        id: crypto.randomUUID(),
        completed: false,
      })),
      currentCheckpointIndex: 0,
      cognitiveLevel: listItem.cognitiveLevel,
      minimumViableSession: listItem.minimumViableSession,
    };

    // Add to scheduled day or today
    const today = dayConfig?.date;

    if (today && date === today) {
      // Add to today
      const updated = {
        ...dayConfig,
        missions: [...dayConfig.missions, newMission],
      };
      setDayConfig(updated);
      saveToStorage(STORAGE_KEYS.dayConfig, updated);
    } else {
      // Add to scheduled day
      const updatedDays = [...scheduledDays];
      const dayIndex = updatedDays.findIndex(sd => sd.date === date);

      if (dayIndex >= 0) {
        updatedDays[dayIndex].missions.push(newMission);
      } else {
        updatedDays.push({ date, missions: [newMission] });
      }

      setScheduledDays(updatedDays);
      saveToStorage(STORAGE_KEYS.scheduledDays, updatedDays);
    }

    // Remove from missions list
    const updatedList = missionsList.filter(m => m.id !== listItemId);
    setMissionsList(updatedList);
    saveToStorage(STORAGE_KEYS.missionsList, updatedList);
  }, [missionsList, dayConfig, scheduledDays]);

  // Scheduled days management
  const addMissionToDay = useCallback((date: string, title: string, duration: number, cognitiveLevel: CognitiveLevel, minimumViableSession: MinimumViableSession, checkpoints?: { title: string; duration: number }[]): string => {
    const missionId = crypto.randomUUID();
    const newMission: Mission = {
      id: missionId,
      title,
      duration,
      order: 0,
      completed: false,
      checkpoints: (checkpoints || []).map((cp, idx) => ({
        id: crypto.randomUUID(),
        title: cp.title,
        duration: cp.duration,
        order: idx,
        completed: false,
      })),
      currentCheckpointIndex: 0,
      scheduledDate: date,
      cognitiveLevel,
      minimumViableSession,
    };

    const today = dayConfig?.date;

    if (today && date === today) {
      // Add to today's config
      const updated = {
        ...dayConfig,
        missions: [...dayConfig.missions, newMission],
      };
      setDayConfig(updated);
      saveToStorage(STORAGE_KEYS.dayConfig, updated);
    } else {
      // Add to scheduled days
      const updatedDays = [...scheduledDays];
      const dayIndex = updatedDays.findIndex(sd => sd.date === date);

      if (dayIndex >= 0) {
        updatedDays[dayIndex].missions.push(newMission);
      } else {
        updatedDays.push({ date, missions: [newMission] });
      }

      setScheduledDays(updatedDays);
      saveToStorage(STORAGE_KEYS.scheduledDays, updatedDays);
    }

    return missionId;
  }, [dayConfig, scheduledDays]);

  const getMissionsForDay = useCallback((date: string): Mission[] => {
    const today = dayConfig?.date;

    if (today && date === today) {
      return dayConfig?.missions || [];
    }

    const scheduled = scheduledDays.find(sd => sd.date === date);
    return scheduled?.missions || [];
  }, [dayConfig, scheduledDays]);

  const moveMissionToDay = useCallback((missionId: string, fromDate: string, toDate: string) => {
    const today = dayConfig?.date;
    let mission: Mission | undefined;

    // Find and remove mission from source
    if (today && fromDate === today) {
      mission = dayConfig?.missions.find(m => m.id === missionId);
      if (mission) {
        const updated = {
          ...dayConfig!,
          missions: dayConfig!.missions.filter(m => m.id !== missionId),
        };
        setDayConfig(updated);
        saveToStorage(STORAGE_KEYS.dayConfig, updated);
      }
    } else {
      const dayIndex = scheduledDays.findIndex(sd => sd.date === fromDate);
      if (dayIndex >= 0) {
        mission = scheduledDays[dayIndex].missions.find(m => m.id === missionId);
        if (mission) {
          const updatedDays = [...scheduledDays];
          updatedDays[dayIndex].missions = updatedDays[dayIndex].missions.filter(m => m.id !== missionId);
          if (updatedDays[dayIndex].missions.length === 0) {
            updatedDays.splice(dayIndex, 1);
          }
          setScheduledDays(updatedDays);
          saveToStorage(STORAGE_KEYS.scheduledDays, updatedDays);
        }
      }
    }

    if (!mission) return;

    // Add to destination
    const movedMission = { ...mission, missionNumber: undefined, scheduledDate: toDate };

    if (today && toDate === today) {
      const updated = {
        ...dayConfig!,
        missions: [...dayConfig!.missions, movedMission],
      };
      setDayConfig(updated);
      saveToStorage(STORAGE_KEYS.dayConfig, updated);
    } else {
      const updatedDays = [...scheduledDays];
      const dayIndex = updatedDays.findIndex(sd => sd.date === toDate);

      if (dayIndex >= 0) {
        updatedDays[dayIndex].missions.push(movedMission);
      } else {
        updatedDays.push({ date: toDate, missions: [movedMission] });
      }

      setScheduledDays(updatedDays);
      saveToStorage(STORAGE_KEYS.scheduledDays, updatedDays);
    }
  }, [dayConfig, scheduledDays]);

  // Checkpoint management
  const addCheckpoint = useCallback((missionId: string, title: string, duration: number) => {
    const newCheckpoint: Checkpoint = {
      id: crypto.randomUUID(),
      title,
      duration,
      order: 0, // Will be set properly below
      completed: false,
    };

    // First check if mission is in dayConfig (today's session)
    if (dayConfig) {
      const mission = dayConfig.missions.find(m => m.id === missionId);
      if (mission) {
        newCheckpoint.order = mission.checkpoints.length;
        const updated = {
          ...dayConfig,
          missions: dayConfig.missions.map(m =>
            m.id === missionId ? { ...m, checkpoints: [...m.checkpoints, newCheckpoint] } : m
          ),
        };
        setDayConfig(updated);
        saveToStorage(STORAGE_KEYS.dayConfig, updated);
        return;
      }
    }

    // Otherwise check scheduled days
    const updatedDays = scheduledDays.map(sd => {
      const mission = sd.missions.find(m => m.id === missionId);
      if (mission) {
        newCheckpoint.order = mission.checkpoints.length;
        return {
          ...sd,
          missions: sd.missions.map(m =>
            m.id === missionId ? { ...m, checkpoints: [...m.checkpoints, newCheckpoint] } : m
          ),
        };
      }
      return sd;
    });

    if (JSON.stringify(updatedDays) !== JSON.stringify(scheduledDays)) {
      setScheduledDays(updatedDays);
      saveToStorage(STORAGE_KEYS.scheduledDays, updatedDays);
    }
  }, [dayConfig, scheduledDays]);

  const updateCheckpoint = useCallback((missionId: string, checkpointId: string, updates: Partial<Checkpoint>) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m =>
        m.id === missionId
          ? { ...m, checkpoints: m.checkpoints.map(cp => cp.id === checkpointId ? { ...cp, ...updates } : cp) }
          : m
      ),
    };
    setDayConfig(updated);
    saveToStorage(STORAGE_KEYS.dayConfig, updated);
  }, [dayConfig]);

  const deleteCheckpoint = useCallback((missionId: string, checkpointId: string) => {
    // First check if mission is in dayConfig
    if (dayConfig) {
      const mission = dayConfig.missions.find(m => m.id === missionId);
      if (mission) {
        const updated = {
          ...dayConfig,
          missions: dayConfig.missions.map(m => {
            if (m.id !== missionId) return m;
            const filtered = m.checkpoints.filter(cp => cp.id !== checkpointId);
            return { ...m, checkpoints: filtered.map((cp, i) => ({ ...cp, order: i })) };
          }),
        };
        setDayConfig(updated);
        saveToStorage(STORAGE_KEYS.dayConfig, updated);
        return;
      }
    }

    // Otherwise check scheduled days
    const updatedDays = scheduledDays.map(sd => {
      const mission = sd.missions.find(m => m.id === missionId);
      if (mission) {
        return {
          ...sd,
          missions: sd.missions.map(m => {
            if (m.id !== missionId) return m;
            const filtered = m.checkpoints.filter(cp => cp.id !== checkpointId);
            return { ...m, checkpoints: filtered.map((cp, i) => ({ ...cp, order: i })) };
          }),
        };
      }
      return sd;
    });

    if (JSON.stringify(updatedDays) !== JSON.stringify(scheduledDays)) {
      setScheduledDays(updatedDays);
      saveToStorage(STORAGE_KEYS.scheduledDays, updatedDays);
    }
  }, [dayConfig, scheduledDays]);

  const addCheckpointToListItem = useCallback((listItemId: string, title: string, duration: number) => {
    const updated = missionsList.map(m => {
      if (m.id !== listItemId) return m;
      return {
        ...m,
        checkpoints: [...m.checkpoints, { id: crypto.randomUUID(), title, duration, order: m.checkpoints.length }],
      };
    });
    setMissionsList(updated);
    saveToStorage(STORAGE_KEYS.missionsList, updated);
  }, [missionsList]);

  const deleteCheckpointFromListItem = useCallback((listItemId: string, checkpointIndex: number) => {
    const updated = missionsList.map(m => {
      if (m.id !== listItemId) return m;
      const filtered = m.checkpoints.filter((_, i) => i !== checkpointIndex);
      return { ...m, checkpoints: filtered.map((cp, i) => ({ ...cp, order: i })) };
    });
    setMissionsList(updated);
    saveToStorage(STORAGE_KEYS.missionsList, updated);
  }, [missionsList]);

  // Active mission management
  const startMission = useCallback((missionId: string) => {
    const mission = dayConfig?.missions.find(m => m.id === missionId);
    if (!mission) return;

    const firstIncompleteCheckpoint = mission.checkpoints.find(cp => !cp.completed);

    const newActiveMission: ActiveMissionState = {
      missionId,
      checkpointId: firstIncompleteCheckpoint?.id || null,
      startedAt: Date.now(),
      timeCap: firstIncompleteCheckpoint?.duration || mission.duration,
    };
    setActiveMission(newActiveMission);
    saveToStorage(STORAGE_KEYS.activeMission, newActiveMission);
  }, [dayConfig]);

  const completeCurrentCheckpoint = useCallback(() => {
    if (!activeMission || !dayConfig) return;

    const mission = dayConfig.missions.find(m => m.id === activeMission.missionId);
    if (!mission) return;

    const timeSpent = Math.round((Date.now() - activeMission.startedAt) / 60000);

    if (activeMission.checkpointId) {
      const updatedCheckpoints = mission.checkpoints.map(cp =>
        cp.id === activeMission.checkpointId
          ? { ...cp, completed: true, completedAt: new Date().toISOString(), timeSpent }
          : cp
      );

      const nextIncomplete = updatedCheckpoints.find(cp => !cp.completed);

      if (nextIncomplete) {
        const updated = {
          ...dayConfig,
          missions: dayConfig.missions.map(m =>
            m.id === mission.id ? { ...m, checkpoints: updatedCheckpoints } : m
          ),
        };
        setDayConfig(updated);
        saveToStorage(STORAGE_KEYS.dayConfig, updated);

        const newActive: ActiveMissionState = {
          missionId: mission.id,
          checkpointId: nextIncomplete.id,
          startedAt: Date.now(),
          timeCap: nextIncomplete.duration,
        };
        setActiveMission(newActive);
        saveToStorage(STORAGE_KEYS.activeMission, newActive);
      } else {
        const totalTimeSpent = updatedCheckpoints.reduce((sum, cp) => sum + (cp.timeSpent || 0), 0);

        const updated = {
          ...dayConfig,
          missions: dayConfig.missions.map(m =>
            m.id === mission.id
              ? { ...m, checkpoints: updatedCheckpoints, completed: true, completedAt: new Date().toISOString(), timeSpent: totalTimeSpent }
              : m
          ),
        };
        setDayConfig(updated);
        saveToStorage(STORAGE_KEYS.dayConfig, updated);
        setActiveMission(null);
        saveToStorage(STORAGE_KEYS.activeMission, null);
      }
    }
  }, [activeMission, dayConfig]);

  const completeMission = useCallback(() => {
    if (!activeMission || !dayConfig) return;

    const mission = dayConfig.missions.find(m => m.id === activeMission.missionId);
    if (!mission) return;

    const hasIncompleteCheckpoints = mission.checkpoints.some(cp => !cp.completed);
    if (hasIncompleteCheckpoints) return;

    const timeSpent = Math.round((Date.now() - activeMission.startedAt) / 60000);
    const totalTimeSpent = mission.checkpoints.reduce((sum, cp) => sum + (cp.timeSpent || 0), 0) + timeSpent;

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m =>
        m.id === activeMission.missionId
          ? { ...m, completed: true, completedAt: new Date().toISOString(), timeSpent: totalTimeSpent }
          : m
      ),
    };
    setDayConfig(updated);
    saveToStorage(STORAGE_KEYS.dayConfig, updated);
    setActiveMission(null);
    saveToStorage(STORAGE_KEYS.activeMission, null);
  }, [activeMission, dayConfig]);

  const cancelActiveMission = useCallback(() => {
    setActiveMission(null);
    saveToStorage(STORAGE_KEYS.activeMission, null);
  }, []);

  const updateTimeCap = useCallback((minutes: number) => {
    if (!activeMission) return;
    const updated = { ...activeMission, timeCap: minutes };
    setActiveMission(updated);
    saveToStorage(STORAGE_KEYS.activeMission, updated);
  }, [activeMission]);

  // Bottleneck management
  const reportBottleneck = useCallback((reason: string, impedesProgress: boolean) => {
    if (!activeMission || !dayConfig) return;

    const currentMission = dayConfig.missions.find(m => m.id === activeMission.missionId);
    if (!currentMission) return;

    if (impedesProgress) {
      const bottleneckedMission: Mission = {
        ...currentMission,
        isBottleneck: true,
        bottleneckReason: reason,
        bottleneckDate: new Date().toISOString(),
      };

      const bottleneckFixMission: Mission = {
        id: crypto.randomUUID(),
        title: `Fix: ${reason}`,
        duration: 30,
        order: 0,
        completed: false,
        checkpoints: [],
        currentCheckpointIndex: 0,
        parentMissionId: currentMission.id,
        cognitiveLevel: 3, // Default to routine work for fix tasks
        minimumViableSession: 30,
      };

      const updatedMissions = dayConfig.missions
        .filter(m => m.id !== currentMission.id)
        .map(m => ({ ...m, order: m.order + 1 }));

      const updated = {
        ...dayConfig,
        missions: [bottleneckFixMission, ...updatedMissions],
      };
      setDayConfig(updated);
      saveToStorage(STORAGE_KEYS.dayConfig, updated);

      const updatedBottlenecked = [...bottleneckedMissions, bottleneckedMission];
      setBottleneckedMissions(updatedBottlenecked);
      saveToStorage(STORAGE_KEYS.bottleneckedMissions, updatedBottlenecked);

      const newActive: ActiveMissionState = {
        missionId: bottleneckFixMission.id,
        checkpointId: null,
        startedAt: Date.now(),
        timeCap: bottleneckFixMission.duration,
      };
      setActiveMission(newActive);
      saveToStorage(STORAGE_KEYS.activeMission, newActive);
    } else {
      const bottleneckMission: Mission = {
        id: crypto.randomUUID(),
        title: `Address: ${reason}`,
        duration: 30,
        order: dayConfig.missions.filter(m => !m.completed && !m.isBottleneck).length,
        completed: false,
        checkpoints: [],
        currentCheckpointIndex: 0,
        parentMissionId: currentMission.id,
        cognitiveLevel: 2, // Light work for address tasks
        minimumViableSession: 30,
      };

      const updated = {
        ...dayConfig,
        missions: [...dayConfig.missions, bottleneckMission],
      };
      setDayConfig(updated);
      saveToStorage(STORAGE_KEYS.dayConfig, updated);
    }
  }, [activeMission, dayConfig, bottleneckedMissions]);

  const resolveBottleneck = useCallback((missionId: string) => {
    const mission = bottleneckedMissions.find(m => m.id === missionId);
    if (!mission) return;

    const updatedBottlenecked = bottleneckedMissions.filter(m => m.id !== missionId);
    setBottleneckedMissions(updatedBottlenecked);
    saveToStorage(STORAGE_KEYS.bottleneckedMissions, updatedBottlenecked);

    if (dayConfig) {
      const restoredMission: Mission = {
        ...mission,
        isBottleneck: false,
        bottleneckReason: undefined,
        bottleneckDate: undefined,
        order: dayConfig.missions.filter(m => !m.completed && !m.isBottleneck).length,
      };

      const updated = {
        ...dayConfig,
        missions: [...dayConfig.missions, restoredMission],
      };
      setDayConfig(updated);
      saveToStorage(STORAGE_KEYS.dayConfig, updated);
    }
  }, [bottleneckedMissions, dayConfig]);

  // Settings
  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    const updated = { ...userSettings, ...updates };
    setUserSettings(updated);
    saveToStorage(STORAGE_KEYS.userSettings, updated);
  }, [userSettings]);

  // Getters
  const getAssignedMissions = useCallback((): Mission[] => {
    if (!dayConfig) return [];
    return dayConfig.missions
      .filter(m => !m.completed && !m.isBottleneck && m.missionNumber !== undefined)
      .sort((a, b) => (a.missionNumber || 0) - (b.missionNumber || 0));
  }, [dayConfig]);

  const getUnassignedMissions = useCallback((): Mission[] => {
    if (!dayConfig) return [];
    return dayConfig.missions
      .filter(m => !m.completed && !m.isBottleneck && m.missionNumber === undefined)
      .sort((a, b) => a.order - b.order);
  }, [dayConfig]);

  const getCurrentMission = useCallback((): Mission | null => {
    const assigned = getAssignedMissions();
    return assigned[0] || null;
  }, [getAssignedMissions]);

  const getCurrentCheckpoint = useCallback((): Checkpoint | null => {
    const currentMission = getCurrentMission();
    if (!currentMission || currentMission.checkpoints.length === 0) return null;
    return currentMission.checkpoints.find(cp => !cp.completed) || null;
  }, [getCurrentMission]);

  const getBriefingData = useCallback(() => {
    const today = formatDate(getEffectiveDate());
    const scheduledForToday = scheduledDays.find(sd => sd.date === today);
    const todayMissions = scheduledForToday?.missions || [];

    const totalCheckpoints = todayMissions.reduce((sum, m) => sum + m.checkpoints.length, 0);

    return {
      todayMissions,
      totalCheckpoints,
      carriedOver: carriedOverMissions,
    };
  }, [scheduledDays, carriedOverMissions]);

  return (
    <DayStartContext.Provider value={{
      appStep,
      dayConfig,
      activeMission,
      logoutFlow,
      loginFlow,
      missionsList,
      scheduledDays,
      completedMissions,
      bottleneckedMissions,
      userSettings,
      startLoginFlow,
      selectEnergyState,
      applyRecommendations,
      skipRecommendations,
      startLogout,
      handleUnfinishedMission,
      skipPlanTomorrow,
      finishLogout,
      getTomorrowDate,
      addMission,
      updateMission,
      deleteMission,
      assignMissionNumber,
      addToMissionsList,
      updateMissionListItem,
      deleteMissionListItem,
      moveMissionListItemToCategory,
      scheduleMissionFromList,
      addMissionToDay,
      getMissionsForDay,
      moveMissionToDay,
      addCheckpoint,
      updateCheckpoint,
      deleteCheckpoint,
      addCheckpointToListItem,
      deleteCheckpointFromListItem,
      startMission,
      completeCurrentCheckpoint,
      completeMission,
      cancelActiveMission,
      updateTimeCap,
      reportBottleneck,
      resolveBottleneck,
      updateSettings,
      getCurrentMission,
      getCurrentCheckpoint,
      getAssignedMissions,
      getUnassignedMissions,
      getBriefingData,
    }}>
      {children}
    </DayStartContext.Provider>
  );
}

export function useDayStart() {
  const context = useContext(DayStartContext);
  if (!context) {
    throw new Error('useDayStart must be used within a DayStartProvider');
  }
  return context;
}
