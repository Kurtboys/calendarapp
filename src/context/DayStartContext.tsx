import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { DayConfig, Mission, Checkpoint, RepeatingMission } from '../types';
import { getEffectiveDateString, hasNewDayStarted, getCurrentHour } from '../utils/date';

type DayStartStep = 'ready' | 'configure' | 'complete';

interface ActiveMissionState {
  missionId: string;
  checkpointId: string | null; // null if working on mission without checkpoints
  startedAt: number; // timestamp when current checkpoint/mission started
  timeCap: number; // minutes for current checkpoint or mission
}

interface DayStartContextType {
  step: DayStartStep;
  dayConfig: DayConfig | null;
  currentDayDate: string;
  activeMission: ActiveMissionState | null;
  repeatingMissions: RepeatingMission[];
  bottleneckedMissions: Mission[]; // missions moved to bottleneck view

  // Step transitions
  proceedToConfig: () => void;
  completeSetup: (endTime: number) => void;

  // Mission management
  addMission: (title: string, duration: number) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  deleteMission: (id: string) => void;
  reorderMissions: (missionIds: string[]) => void;
  assignMissionNumber: (missionId: string, number: number | undefined) => void;

  // Checkpoint management
  addCheckpoint: (missionId: string, title: string, duration: number) => void;
  updateCheckpoint: (missionId: string, checkpointId: string, updates: Partial<Checkpoint>) => void;
  deleteCheckpoint: (missionId: string, checkpointId: string) => void;
  reorderCheckpoints: (missionId: string, checkpointIds: string[]) => void;

  // Repeating mission management
  toggleMissionRepeating: (missionId: string) => void;

  // Active mission management
  startMission: (missionId: string) => void;
  completeCurrentCheckpoint: () => void;
  completeMission: () => void;
  cancelActiveMission: () => void;
  updateTimeCap: (minutes: number) => void;

  // Bottleneck management
  reportBottleneck: (reason: string, impedesProgress: boolean) => void;
  resolveBottleneck: (missionId: string) => void;
  moveBottleneckToDay: (missionId: string, date: string) => void;

  // Get current mission/checkpoint for Mission Mode
  getCurrentMission: () => Mission | null;
  getCurrentCheckpoint: () => Checkpoint | null;
  getAssignedMissions: () => Mission[]; // missions with numbers, sorted by number
  getUnassignedMissions: () => Mission[]; // missions without numbers (in sidebar)
}

const DayStartContext = createContext<DayStartContextType | undefined>(undefined);

const STORAGE_KEY = 'dayConfig';
const ACTIVE_MISSION_KEY = 'activeMission';
const REPEATING_MISSIONS_KEY = 'repeatingMissions';
const BOTTLENECKED_MISSIONS_KEY = 'bottleneckedMissions';

function loadDayConfig(): DayConfig | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const config = JSON.parse(stored);
    // Migration: convert old 'goals' to 'missions'
    if (config.goals && !config.missions) {
      config.missions = config.goals.map((g: any) => ({
        ...g,
        checkpoints: [],
        currentCheckpointIndex: 0,
      }));
      delete config.goals;
    }
    return config;
  } catch {
    return null;
  }
}

function saveDayConfig(config: DayConfig | null) {
  if (config) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function loadActiveMission(): ActiveMissionState | null {
  const stored = localStorage.getItem(ACTIVE_MISSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveActiveMission(state: ActiveMissionState | null) {
  if (state) {
    localStorage.setItem(ACTIVE_MISSION_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(ACTIVE_MISSION_KEY);
  }
}

function loadRepeatingMissions(): RepeatingMission[] {
  const stored = localStorage.getItem(REPEATING_MISSIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveRepeatingMissions(missions: RepeatingMission[]) {
  localStorage.setItem(REPEATING_MISSIONS_KEY, JSON.stringify(missions));
}

function loadBottleneckedMissions(): Mission[] {
  const stored = localStorage.getItem(BOTTLENECKED_MISSIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

function saveBottleneckedMissions(missions: Mission[]) {
  localStorage.setItem(BOTTLENECKED_MISSIONS_KEY, JSON.stringify(missions));
}

export function DayStartProvider({ children }: { children: ReactNode }) {
  const [dayConfig, setDayConfig] = useState<DayConfig | null>(() => loadDayConfig());
  const [activeMission, setActiveMission] = useState<ActiveMissionState | null>(() => loadActiveMission());
  const [repeatingMissions, setRepeatingMissions] = useState<RepeatingMission[]>(() => loadRepeatingMissions());
  const [bottleneckedMissions, setBottleneckedMissions] = useState<Mission[]>(() => loadBottleneckedMissions());

  const currentDayDate = getEffectiveDateString();

  // Determine current step based on state
  const getStep = (): DayStartStep => {
    if (!dayConfig || hasNewDayStarted(dayConfig.date)) {
      return 'ready';
    }
    return 'complete';
  };

  const [step, setStep] = useState<DayStartStep>(getStep);

  // Clear active mission on new day
  useEffect(() => {
    if (hasNewDayStarted(dayConfig?.date || null)) {
      setActiveMission(null);
      saveActiveMission(null);
    }
  }, [dayConfig?.date]);

  // Check for day changes periodically
  useEffect(() => {
    const checkDayChange = () => {
      const newStep = getStep();
      if (newStep !== step) {
        setStep(newStep);
      }
    };

    const interval = setInterval(checkDayChange, 60000);
    return () => clearInterval(interval);
  }, [step, dayConfig]);

  // Update step when dayConfig changes
  useEffect(() => {
    setStep(getStep());
  }, [dayConfig?.date]);

  const proceedToConfig = useCallback(() => {
    setStep('configure');
  }, []);

  const completeSetup = useCallback((endTime: number) => {
    // Auto-capture current hour as start time
    const startTime = getCurrentHour();
    const existingMissions = dayConfig?.date === currentDayDate ? dayConfig.missions : [];

    // Create missions from repeating missions if this is a fresh day
    const newRepeatingMissionInstances: Mission[] = dayConfig?.date !== currentDayDate
      ? repeatingMissions.map((rm, index) => ({
          id: crypto.randomUUID(),
          title: rm.title,
          duration: rm.duration,
          order: index,
          completed: false,
          checkpoints: rm.checkpoints.map((cp, cpIndex) => ({
            id: crypto.randomUUID(),
            title: cp.title,
            duration: cp.duration,
            order: cpIndex,
            completed: false,
          })),
          currentCheckpointIndex: 0,
          isRepeating: true,
          repeatingMissionId: rm.id,
        }))
      : [];

    const newConfig: DayConfig = {
      date: currentDayDate,
      startTime,
      endTime,
      missions: existingMissions.length > 0 ? existingMissions : newRepeatingMissionInstances,
      startedAt: new Date().toISOString(),
    };
    setDayConfig(newConfig);
    saveDayConfig(newConfig);
    setStep('complete');
  }, [currentDayDate, dayConfig, repeatingMissions]);

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
    saveDayConfig(updated);
  }, [dayConfig]);

  const updateMission = useCallback((id: string, updates: Partial<Mission>) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m =>
        m.id === id ? { ...m, ...updates } : m
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const deleteMission = useCallback((id: string) => {
    if (!dayConfig) return;

    if (activeMission?.missionId === id) {
      setActiveMission(null);
      saveActiveMission(null);
    }

    const filtered = dayConfig.missions.filter(m => m.id !== id);
    const pendingMissions = filtered.filter(m => !m.completed && !m.isBottleneck);
    const otherMissions = filtered.filter(m => m.completed || m.isBottleneck);
    const reordered = [
      ...pendingMissions.map((m, i) => ({ ...m, order: i })),
      ...otherMissions,
    ];

    const updated = {
      ...dayConfig,
      missions: reordered,
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig, activeMission]);

  const reorderMissions = useCallback((missionIds: string[]) => {
    if (!dayConfig) return;

    const reordered = missionIds.map((id, index) => {
      const mission = dayConfig.missions.find(m => m.id === id);
      return mission ? { ...mission, order: index } : null;
    }).filter((m): m is Mission => m !== null);

    const otherMissions = dayConfig.missions.filter(m =>
      !missionIds.includes(m.id)
    );

    const updated = {
      ...dayConfig,
      missions: [...reordered, ...otherMissions],
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const assignMissionNumber = useCallback((missionId: string, number: number | undefined) => {
    if (!dayConfig) return;

    // If assigning a number, first remove that number from any other mission
    let updatedMissions = dayConfig.missions;
    if (number !== undefined) {
      updatedMissions = dayConfig.missions.map(m =>
        m.missionNumber === number ? { ...m, missionNumber: undefined } : m
      );
    }

    // Now assign the number to the target mission
    updatedMissions = updatedMissions.map(m =>
      m.id === missionId ? { ...m, missionNumber: number } : m
    );

    const updated = {
      ...dayConfig,
      missions: updatedMissions,
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

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
        m.id === missionId
          ? { ...m, checkpoints: [...m.checkpoints, newCheckpoint] }
          : m
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const updateCheckpoint = useCallback((missionId: string, checkpointId: string, updates: Partial<Checkpoint>) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m =>
        m.id === missionId
          ? {
              ...m,
              checkpoints: m.checkpoints.map(cp =>
                cp.id === checkpointId ? { ...cp, ...updates } : cp
              ),
            }
          : m
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const deleteCheckpoint = useCallback((missionId: string, checkpointId: string) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m => {
        if (m.id !== missionId) return m;

        const filtered = m.checkpoints.filter(cp => cp.id !== checkpointId);
        const reordered = filtered.map((cp, i) => ({ ...cp, order: i }));

        return {
          ...m,
          checkpoints: reordered,
          currentCheckpointIndex: Math.min(m.currentCheckpointIndex, Math.max(0, reordered.length - 1)),
        };
      }),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const reorderCheckpoints = useCallback((missionId: string, checkpointIds: string[]) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m => {
        if (m.id !== missionId) return m;

        const reordered = checkpointIds.map((id, index) => {
          const cp = m.checkpoints.find(c => c.id === id);
          return cp ? { ...cp, order: index } : null;
        }).filter((cp): cp is Checkpoint => cp !== null);

        return { ...m, checkpoints: reordered };
      }),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const toggleMissionRepeating = useCallback((missionId: string) => {
    if (!dayConfig) return;

    const mission = dayConfig.missions.find(m => m.id === missionId);
    if (!mission) return;

    if (mission.isRepeating) {
      // Remove from repeating missions
      if (mission.repeatingMissionId) {
        const updatedRepeating = repeatingMissions.filter(rm => rm.id !== mission.repeatingMissionId);
        setRepeatingMissions(updatedRepeating);
        saveRepeatingMissions(updatedRepeating);
      }
      updateMission(missionId, { isRepeating: false, repeatingMissionId: undefined });
    } else {
      // Add to repeating missions
      const newRepeatingMission: RepeatingMission = {
        id: crypto.randomUUID(),
        title: mission.title,
        duration: mission.duration,
        checkpoints: mission.checkpoints.map(cp => ({
          title: cp.title,
          duration: cp.duration,
          order: cp.order,
        })),
        order: repeatingMissions.length,
      };
      const updatedRepeating = [...repeatingMissions, newRepeatingMission];
      setRepeatingMissions(updatedRepeating);
      saveRepeatingMissions(updatedRepeating);
      updateMission(missionId, { isRepeating: true, repeatingMissionId: newRepeatingMission.id });
    }
  }, [dayConfig, repeatingMissions, updateMission]);

  const startMission = useCallback((missionId: string) => {
    const mission = dayConfig?.missions.find(m => m.id === missionId);
    if (!mission) return;

    // Find first incomplete checkpoint, or use mission if no checkpoints
    const firstIncompleteCheckpoint = mission.checkpoints.find(cp => !cp.completed);

    const newActiveMission: ActiveMissionState = {
      missionId,
      checkpointId: firstIncompleteCheckpoint?.id || null,
      startedAt: Date.now(),
      timeCap: firstIncompleteCheckpoint?.duration || mission.duration,
    };
    setActiveMission(newActiveMission);
    saveActiveMission(newActiveMission);

    // Update current checkpoint index
    if (firstIncompleteCheckpoint) {
      const checkpointIndex = mission.checkpoints.findIndex(cp => cp.id === firstIncompleteCheckpoint.id);
      updateMission(missionId, { currentCheckpointIndex: checkpointIndex });
    }
  }, [dayConfig, updateMission]);

  const completeCurrentCheckpoint = useCallback(() => {
    if (!activeMission || !dayConfig) return;

    const mission = dayConfig.missions.find(m => m.id === activeMission.missionId);
    if (!mission) return;

    const timeSpent = Math.round((Date.now() - activeMission.startedAt) / 60000);

    if (activeMission.checkpointId) {
      // Complete the current checkpoint
      const updatedCheckpoints = mission.checkpoints.map(cp =>
        cp.id === activeMission.checkpointId
          ? { ...cp, completed: true, completedAt: new Date().toISOString(), timeSpent }
          : cp
      );

      // Find next incomplete checkpoint
      const nextIncomplete = updatedCheckpoints.find(cp => !cp.completed);

      if (nextIncomplete) {
        // Move to next checkpoint
        const nextIndex = updatedCheckpoints.findIndex(cp => cp.id === nextIncomplete.id);

        const updated = {
          ...dayConfig,
          missions: dayConfig.missions.map(m =>
            m.id === mission.id
              ? { ...m, checkpoints: updatedCheckpoints, currentCheckpointIndex: nextIndex }
              : m
          ),
        };
        setDayConfig(updated);
        saveDayConfig(updated);

        // Update active mission to next checkpoint
        const newActiveMission: ActiveMissionState = {
          missionId: mission.id,
          checkpointId: nextIncomplete.id,
          startedAt: Date.now(),
          timeCap: nextIncomplete.duration,
        };
        setActiveMission(newActiveMission);
        saveActiveMission(newActiveMission);
      } else {
        // All checkpoints done - complete the mission
        const totalTimeSpent = updatedCheckpoints.reduce((sum, cp) => sum + (cp.timeSpent || 0), 0);

        const updated = {
          ...dayConfig,
          missions: dayConfig.missions.map(m =>
            m.id === mission.id
              ? {
                  ...m,
                  checkpoints: updatedCheckpoints,
                  completed: true,
                  completedAt: new Date().toISOString(),
                  timeSpent: totalTimeSpent,
                }
              : m
          ),
        };
        setDayConfig(updated);
        saveDayConfig(updated);
        setActiveMission(null);
        saveActiveMission(null);
      }
    }
  }, [activeMission, dayConfig]);

  const completeMission = useCallback(() => {
    if (!activeMission || !dayConfig) return;

    const mission = dayConfig.missions.find(m => m.id === activeMission.missionId);
    if (!mission) return;

    // If mission has incomplete checkpoints, can't complete
    const hasIncompleteCheckpoints = mission.checkpoints.some(cp => !cp.completed);
    if (hasIncompleteCheckpoints) return;

    const timeSpent = Math.round((Date.now() - activeMission.startedAt) / 60000);
    const totalTimeSpent = mission.checkpoints.reduce((sum, cp) => sum + (cp.timeSpent || 0), 0) + timeSpent;

    const updated = {
      ...dayConfig,
      missions: dayConfig.missions.map(m =>
        m.id === activeMission.missionId
          ? {
              ...m,
              completed: true,
              completedAt: new Date().toISOString(),
              timeSpent: totalTimeSpent,
            }
          : m
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
    setActiveMission(null);
    saveActiveMission(null);
  }, [activeMission, dayConfig]);

  const cancelActiveMission = useCallback(() => {
    setActiveMission(null);
    saveActiveMission(null);
  }, []);

  const updateTimeCap = useCallback((minutes: number) => {
    if (!activeMission) return;

    const updated = {
      ...activeMission,
      timeCap: minutes,
    };
    setActiveMission(updated);
    saveActiveMission(updated);
  }, [activeMission]);

  // Bottleneck management
  const reportBottleneck = useCallback((reason: string, impedesProgress: boolean) => {
    if (!activeMission || !dayConfig) return;

    const currentMission = dayConfig.missions.find(m => m.id === activeMission.missionId);
    if (!currentMission) return;

    if (impedesProgress) {
      // Move current mission to bottleneck view
      const bottleneckedMission: Mission = {
        ...currentMission,
        isBottleneck: true,
        bottleneckReason: reason,
        bottleneckDate: new Date().toISOString(),
      };

      // Create a new bottleneck-fix mission that jumps to front
      const bottleneckFixMission: Mission = {
        id: crypto.randomUUID(),
        title: `Fix: ${reason}`,
        duration: 30, // Default 30 min
        order: -1, // Will be reordered to front
        completed: false,
        checkpoints: [],
        currentCheckpointIndex: 0,
        parentMissionId: currentMission.id,
      };

      // Remove current mission from active list and add bottleneck fix
      const updatedMissions = dayConfig.missions
        .filter(m => m.id !== currentMission.id)
        .map(m => ({ ...m, order: m.order + 1 })); // Shift all orders up

      bottleneckFixMission.order = 0; // Put at front

      const updated = {
        ...dayConfig,
        missions: [bottleneckFixMission, ...updatedMissions],
      };
      setDayConfig(updated);
      saveDayConfig(updated);

      // Add to bottlenecked missions
      const updatedBottlenecked = [...bottleneckedMissions, bottleneckedMission];
      setBottleneckedMissions(updatedBottlenecked);
      saveBottleneckedMissions(updatedBottlenecked);

      // Start the bottleneck fix mission
      setActiveMission({
        missionId: bottleneckFixMission.id,
        checkpointId: null,
        startedAt: Date.now(),
        timeCap: bottleneckFixMission.duration,
      });
      saveActiveMission({
        missionId: bottleneckFixMission.id,
        checkpointId: null,
        startedAt: Date.now(),
        timeCap: bottleneckFixMission.duration,
      });
    } else {
      // Add bottleneck mission to end of queue
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
      saveDayConfig(updated);
    }
  }, [activeMission, dayConfig, bottleneckedMissions]);

  const resolveBottleneck = useCallback((missionId: string) => {
    // Find the bottlenecked mission
    const mission = bottleneckedMissions.find(m => m.id === missionId);
    if (!mission) return;

    // Remove from bottlenecked list
    const updatedBottlenecked = bottleneckedMissions.filter(m => m.id !== missionId);
    setBottleneckedMissions(updatedBottlenecked);
    saveBottleneckedMissions(updatedBottlenecked);

    // Add back to today's missions (at the end)
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
      saveDayConfig(updated);
    }
  }, [bottleneckedMissions, dayConfig]);

  const moveBottleneckToDay = useCallback((missionId: string, _date: string) => {
    // For now, just keep in bottleneck view - full date moving would need more infrastructure
    // This could be expanded to store missions per date
    console.log(`Would move mission ${missionId} to ${_date}`);
  }, []);

  // Get assigned missions (have mission numbers) sorted by number
  const getAssignedMissions = useCallback((): Mission[] => {
    if (!dayConfig) return [];

    return dayConfig.missions
      .filter(m => !m.completed && !m.isBottleneck && m.missionNumber !== undefined)
      .sort((a, b) => (a.missionNumber || 0) - (b.missionNumber || 0));
  }, [dayConfig]);

  // Get unassigned missions (no mission number) - shown in sidebar
  const getUnassignedMissions = useCallback((): Mission[] => {
    if (!dayConfig) return [];

    return dayConfig.missions
      .filter(m => !m.completed && !m.isBottleneck && m.missionNumber === undefined)
      .sort((a, b) => a.order - b.order);
  }, [dayConfig]);

  // Get current mission for Mission Mode (first incomplete assigned mission by number)
  const getCurrentMission = useCallback((): Mission | null => {
    const assignedMissions = getAssignedMissions();
    return assignedMissions[0] || null;
  }, [getAssignedMissions]);

  // Get current checkpoint for Mission Mode
  const getCurrentCheckpoint = useCallback((): Checkpoint | null => {
    const currentMission = getCurrentMission();
    if (!currentMission || currentMission.checkpoints.length === 0) return null;

    const incompleteCheckpoint = currentMission.checkpoints
      .sort((a, b) => a.order - b.order)
      .find(cp => !cp.completed);

    return incompleteCheckpoint || null;
  }, [getCurrentMission]);

  return (
    <DayStartContext.Provider value={{
      step,
      dayConfig,
      currentDayDate,
      activeMission,
      repeatingMissions,
      bottleneckedMissions,
      proceedToConfig,
      completeSetup,
      addMission,
      updateMission,
      deleteMission,
      reorderMissions,
      assignMissionNumber,
      addCheckpoint,
      updateCheckpoint,
      deleteCheckpoint,
      reorderCheckpoints,
      toggleMissionRepeating,
      startMission,
      completeCurrentCheckpoint,
      completeMission,
      cancelActiveMission,
      updateTimeCap,
      reportBottleneck,
      resolveBottleneck,
      moveBottleneckToDay,
      getCurrentMission,
      getCurrentCheckpoint,
      getAssignedMissions,
      getUnassignedMissions,
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
