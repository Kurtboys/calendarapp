import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { DayConfig, Goal } from '../types';
import { getEffectiveDateString, hasNewDayStarted } from '../utils/date';

type DayStartStep = 'ready' | 'configure' | 'complete';

interface DayStartContextType {
  step: DayStartStep;
  dayConfig: DayConfig | null;
  currentDayDate: string;

  // Step transitions
  proceedToConfig: () => void;
  completeSetup: (startTime: number, endTime: number) => void;

  // Goal management
  addGoal: (title: string, duration: number) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  reorderGoals: (goalIds: string[]) => void;
  toggleGoalComplete: (id: string) => void;
}

const DayStartContext = createContext<DayStartContextType | undefined>(undefined);

const STORAGE_KEY = 'dayConfig';

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

export function DayStartProvider({ children }: { children: ReactNode }) {
  const [dayConfig, setDayConfig] = useState<DayConfig | null>(() => loadDayConfig());

  const currentDayDate = getEffectiveDateString();

  // Determine current step based on state
  const getStep = (): DayStartStep => {
    if (!dayConfig || hasNewDayStarted(dayConfig.date)) {
      return 'ready';
    }
    return 'complete';
  };

  const [step, setStep] = useState<DayStartStep>(getStep);

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

  const addGoal = useCallback((title: string, duration: number) => {
    if (!dayConfig) return;

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title,
      duration,
      order: dayConfig.goals.length,
      completed: false,
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

    const filtered = dayConfig.goals.filter(g => g.id !== id);
    const reordered = filtered.map((g, i) => ({ ...g, order: i }));

    const updated = {
      ...dayConfig,
      goals: reordered,
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const reorderGoals = useCallback((goalIds: string[]) => {
    if (!dayConfig) return;

    const reordered = goalIds.map((id, index) => {
      const goal = dayConfig.goals.find(g => g.id === id);
      return goal ? { ...goal, order: index } : null;
    }).filter((g): g is Goal => g !== null);

    const updated = {
      ...dayConfig,
      goals: reordered,
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  const toggleGoalComplete = useCallback((id: string) => {
    if (!dayConfig) return;

    const updated = {
      ...dayConfig,
      goals: dayConfig.goals.map(g =>
        g.id === id ? { ...g, completed: !g.completed } : g
      ),
    };
    setDayConfig(updated);
    saveDayConfig(updated);
  }, [dayConfig]);

  return (
    <DayStartContext.Provider value={{
      step,
      dayConfig,
      currentDayDate,
      proceedToConfig,
      completeSetup,
      addGoal,
      updateGoal,
      deleteGoal,
      reorderGoals,
      toggleGoalComplete,
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
