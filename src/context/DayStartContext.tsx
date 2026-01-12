import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { DayConfig, Mission, Checkpoint, MissionListItem, MissionCategory, CompletedMission, UserSettings, ScheduledDay } from '../types';
import { formatDate, addDays, getCurrentHour } from '../utils/date';

type AppStep = 'home' | 'logged-in' | 'logout-flow';

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

interface DayStartContextType {
  // App state
  appStep: AppStep;
  dayConfig: DayConfig | null;
  activeMission: ActiveMissionState | null;
  logoutFlow: LogoutFlowState | null;

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

  // Login/Logout
  loginForDay: () => void;
  startLogout: () => void;
  handleUnfinishedMission: (missionId: string, action: 'tomorrow' | 'missions-list', category?: MissionCategory) => void;
  skipPlanTomorrow: () => void;
  finishLogout: () => void;
  getTomorrowDate: () => string;

  // Mission management (for today)
  addMission: (title: string, duration: number) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  assignMissionNumber: (missionId: string, number: number | undefined) => void;

  // Missions list management
  addToMissionsList: (title: string, duration: number, category: MissionCategory) => void;
  updateMissionListItem: (id: string, updates: Partial<MissionListItem>) => void;
  deleteMissionListItem: (id: string) => void;
  moveMissionListItemToCategory: (id: string, category: MissionCategory) => void;
  scheduleMissionFromList: (listItemId: string, date: string) => void;

  // Scheduled days management
  addMissionToDay: (date: string, title: string, duration: number) => void;
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

  // Determine app step
  const getAppStep = (): AppStep => {
    if (logoutFlow) return 'logout-flow';
    if (dayConfig) return 'logged-in';
    return 'home';
  };

  const [appStep, setAppStep] = useState<AppStep>(getAppStep);

  // Update app step when dependencies change
  useEffect(() => {
    setAppStep(getAppStep());
  }, [dayConfig, logoutFlow]);

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

  // Login for the day
  const loginForDay = useCallback(() => {
    const today = formatDate(new Date());
    const startTime = getCurrentHour();

    // Check if there are missions scheduled for today
    const scheduledForToday = scheduledDays.find(sd => sd.date === today);
    const todayMissions = scheduledForToday?.missions || [];

    // Include carried over missions
    const allMissions = [...carriedOverMissions, ...todayMissions];

    const newConfig: DayConfig = {
      date: today,
      startTime,
      endTime: userSettings.defaultEndTime,
      missions: allMissions,
      startedAt: new Date().toISOString(),
    };

    setDayConfig(newConfig);
    saveToStorage(STORAGE_KEYS.dayConfig, newConfig);

    // Clear carried over since they're now in today
    setCarriedOverMissions([]);
    saveToStorage(STORAGE_KEYS.carriedOverMissions, []);

    // Remove today from scheduled days
    if (scheduledForToday) {
      const updated = scheduledDays.filter(sd => sd.date !== today);
      setScheduledDays(updated);
      saveToStorage(STORAGE_KEYS.scheduledDays, updated);
    }
  }, [scheduledDays, carriedOverMissions, userSettings.defaultEndTime]);

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
      };

      const updatedList = [...missionsList, newListItem];
      setMissionsList(updatedList);
      saveToStorage(STORAGE_KEYS.missionsList, updatedList);
    }

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
      const newCompleted = dayConfig.missions
        .filter(m => m.completed)
        .map(m => ({
          id: m.id,
          title: m.title,
          duration: m.duration,
          timeSpent: m.timeSpent || 0,
          checkpoints: m.checkpoints,
          completedAt: m.completedAt || new Date().toISOString(),
          completedDate: dayConfig.date,
        }));

      const updatedCompleted = [...completedMissions, ...newCompleted];
      setCompletedMissions(updatedCompleted);
      saveToStorage(STORAGE_KEYS.completedMissions, updatedCompleted);
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
  const addMission = useCallback((title: string, duration: number) => {
    if (!dayConfig) return;

    const newMission: Mission = {
      id: crypto.randomUUID(),
      title,
      duration,
      order: dayConfig.missions.filter(m => !m.completed && !m.isBottleneck).length,
      completed: false,
      checkpoints: [],
      currentCheckpointIndex: 0,
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
  const addToMissionsList = useCallback((title: string, duration: number, category: MissionCategory) => {
    const newItem: MissionListItem = {
      id: crypto.randomUUID(),
      title,
      duration,
      checkpoints: [],
      category,
      createdAt: new Date().toISOString(),
      order: missionsList.filter(m => m.category === category).length,
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
  const addMissionToDay = useCallback((date: string, title: string, duration: number) => {
    const newMission: Mission = {
      id: crypto.randomUUID(),
      title,
      duration,
      order: 0,
      completed: false,
      checkpoints: [],
      currentCheckpointIndex: 0,
      scheduledDate: date,
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
    if (!dayConfig) return;

    const mission = dayConfig.missions.find(m => m.id === missionId);
    if (!mission) return;

    const newCheckpoint: Checkpoint = {
      id: crypto.randomUUID(),
      title,
      duration,
      order: mission.checkpoints.length,
      completed: false,
    };

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m =>
        m.id === missionId ? { ...m, checkpoints: [...m.checkpoints, newCheckpoint] } : m
      ),
    };
    setDayConfig(updated);
    saveToStorage(STORAGE_KEYS.dayConfig, updated);
  }, [dayConfig]);

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
    if (!dayConfig) return;

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
  }, [dayConfig]);

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
    const today = formatDate(new Date());
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
      missionsList,
      scheduledDays,
      completedMissions,
      bottleneckedMissions,
      userSettings,
      loginForDay,
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
