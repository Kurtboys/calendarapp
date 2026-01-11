import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { DayConfig, Goal } from '../types';
import { getEffectiveDateString, hasNewDayStarted } from '../utils/date';

type DayStartStep = 'ready' | 'configure' | 'complete';

interface ActiveGoalState {
  goalId: string;
  startedAt: number; // timestamp when started
  timeCap: number; // minutes
}

interface DayStartContextType {
  step: DayStartStep;
  dayConfig: DayConfig | null;
  currentDayDate: string;
  activeGoal: ActiveGoalState | null;

  // Step transitions
  proceedToConfig: () => void;
  completeSetup: (startTime: number, endTime: number) => void;

  // Goal management
  addGoal: (title: string, duration: number, scheduledTime?: number) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  reorderGoals: (goalIds: string[]) => void;
  scheduleGoal: (goalId: string, hour: number) => void;
  unscheduleGoal: (goalId: string) => void;

  // Active goal management
  startGoal: (goalId: string, timeCap?: number) => void;
  completeActiveGoal: () => void;
  cancelActiveGoal: () => void;
  updateTimeCap: (minutes: number) => void;
}

const DayStartContext = createContext<DayStartContextType | undefined>(undefined);

const STORAGE_KEY = 'dayConfig';
const ACTIVE_GOAL_KEY = 'activeGoal';

function loadDayConfig(): DayConfig | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
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

function loadActiveGoal(): ActiveGoalState | null {
  const stored = localStorage.getItem(ACTIVE_GOAL_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveActiveGoal(state: ActiveGoalState | null) {
  if (state) {
    localStorage.setItem(ACTIVE_GOAL_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(ACTIVE_GOAL_KEY);
  }
}

export function DayStartProvider({ children }: { children: ReactNode }) {
  const [dayConfig, setDayConfig] = useState<DayConfig | null>(() => loadDayConfig());
  const [activeGoal, setActiveGoal] = useState<ActiveGoalState | null>(() => loadActiveGoal());

  const currentDayDate = getEffectiveDateString();

  // Determine current step based on state
  const getStep = (): DayStartStep => {
    if (!dayConfig || hasNewDayStarted(dayConfig.date)) {
      return 'ready';
    }
    return 'complete';
  };

  const [step, setStep] = useState<DayStartStep>(getStep);

  // Clear active goal on new day
  useEffect(() => {
    if (hasNewDayStarted(dayConfig?.date || null)) {
      setActiveGoal(null);
      saveActiveGoal(null);
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

  const completeSetup = useCallback((startTime: number, endTime: number) => {
    const newConfig: DayConfig = {
      date: currentDayDate,
      startTime,
      endTime,
      goals: dayConfig?.date === currentDayDate ? dayConfig.goals : [],
      startedAt: new Date().toISOString(),
    };
    setDayConfig(newConfig);
    saveDayConfig(newConfig);
    setStep('complete');
  }, [currentDayDate, dayConfig]);

  const addGoal = useCallback((title: string, duration: number, scheduledTime?: number) => {
    if (!dayConfig) return;

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      duration,
      order: dayConfig.goals.filter(g => !g.completed).length,
      completed: false,
      scheduledTime,
    };

    const updated = {
      ...dayConfig,
      goals: [...dayConfig.goals, newGoal],
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const updateGoal = useCallback((id: string, updates: Partial<Goal>) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      goals: dayConfig.goals.map(g =>
        g.id === id ? { ...g, ...updates } : g
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const deleteGoal = useCallback((id: string) => {
    if (!dayConfig) return;

    // Clear active goal if deleting it
    if (activeGoal?.goalId === id) {
      setActiveGoal(null);
      saveActiveGoal(null);
    }

    const filtered = dayConfig.goals.filter(g => g.id !== id);
    const incompleteGoals = filtered.filter(g => !g.completed);
    const completedGoals = filtered.filter(g => g.completed);
    const reordered = [
      ...incompleteGoals.map((g, i) => ({ ...g, order: i })),
      ...completedGoals,
    ];

    const updated = {
      ...dayConfig,
      goals: reordered,
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig, activeGoal]);

  const reorderGoals = useCallback((goalIds: string[]) => {
    if (!dayConfig) return;

    const reordered = goalIds.map((id, index) => {
      const goal = dayConfig.goals.find(g => g.id === id);
      return goal ? { ...goal, order: index } : null;
    }).filter((g): g is Goal => g !== null);

    // Keep completed goals at the end
    const completedGoals = dayConfig.goals.filter(g => g.completed && !goalIds.includes(g.id));

    const updated = {
      ...dayConfig,
      goals: [...reordered, ...completedGoals],
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const scheduleGoal = useCallback((goalId: string, hour: number) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      goals: dayConfig.goals.map(g =>
        g.id === goalId ? { ...g, scheduledTime: hour } : g
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const unscheduleGoal = useCallback((goalId: string) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      goals: dayConfig.goals.map(g =>
        g.id === goalId ? { ...g, scheduledTime: undefined } : g
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const startGoal = useCallback((goalId: string, timeCap?: number) => {
    const goal = dayConfig?.goals.find(g => g.id === goalId);
    if (!goal) return;

    const newActiveGoal: ActiveGoalState = {
      goalId,
      startedAt: Date.now(),
      timeCap: timeCap ?? goal.duration,
    };
    setActiveGoal(newActiveGoal);
    saveActiveGoal(newActiveGoal);
  }, [dayConfig]);

  const completeActiveGoal = useCallback(() => {
    if (!activeGoal || !dayConfig) return;

    const timeSpent = Math.round((Date.now() - activeGoal.startedAt) / 60000); // Convert to minutes

    const updated = {
      ...dayConfig,
      goals: dayConfig.goals.map(g =>
        g.id === activeGoal.goalId
          ? {
              ...g,
              completed: true,
              completedAt: new Date().toISOString(),
              timeSpent,
            }
          : g
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
    setActiveGoal(null);
    saveActiveGoal(null);
  }, [activeGoal, dayConfig]);

  const cancelActiveGoal = useCallback(() => {
    setActiveGoal(null);
    saveActiveGoal(null);
  }, []);

  const updateTimeCap = useCallback((minutes: number) => {
    if (!activeGoal) return;

    const updated = {
      ...activeGoal,
      timeCap: minutes,
    };
    setActiveGoal(updated);
    saveActiveGoal(updated);
  }, [activeGoal]);

  return (
    <DayStartContext.Provider value={{
      step,
      dayConfig,
      currentDayDate,
      activeGoal,
      proceedToConfig,
      completeSetup,
      addGoal,
      updateGoal,
      deleteGoal,
      reorderGoals,
      scheduleGoal,
      unscheduleGoal,
      startGoal,
      completeActiveGoal,
      cancelActiveGoal,
      updateTimeCap,
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
