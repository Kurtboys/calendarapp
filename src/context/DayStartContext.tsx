import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getEffectiveDateString, hasNewDayStarted } from '../utils/date';

interface DayStartContextType {
  isDayStarted: boolean;
  currentDayDate: string;
  startDay: () => void;
}

const DayStartContext = createContext<DayStartContextType | undefined>(undefined);

const STORAGE_KEY = 'dayStartedDate';

export function DayStartProvider({ children }: { children: ReactNode }) {
  const [dayStartedDate, setDayStartedDate] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY);
  });

  const currentDayDate = getEffectiveDateString();
  const isDayStarted = !hasNewDayStarted(dayStartedDate);

  // Check for day changes periodically (every minute)
  useEffect(() => {
    const checkDayChange = () => {
      const newEffectiveDate = getEffectiveDateString();
      // Force re-render if day has changed
      if (dayStartedDate && newEffectiveDate !== dayStartedDate) {
        // Day has changed - user needs to start the new day
        setDayStartedDate(prev => prev); // Trigger re-render
      }
    };

    const interval = setInterval(checkDayChange, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [dayStartedDate]);

  const startDay = useCallback(() => {
    const today = getEffectiveDateString();
    localStorage.setItem(STORAGE_KEY, today);
    setDayStartedDate(today);
  }, []);

  return (
    <DayStartContext.Provider value={{ isDayStarted, currentDayDate, startDay }}>
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
