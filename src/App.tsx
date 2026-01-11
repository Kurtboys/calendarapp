import { useState, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { TaskProvider } from './context/TaskContext';
import { DayStartProvider, useDayStart } from './context/DayStartContext';
import { Header } from './components/Header';
import { StartDayOverlay } from './components/StartDayOverlay';
import { TodayView, MultiDayView, MonthView, YearView } from './components/views';
import type { ViewType } from './types';
import { addDays, startOfWeek, getEffectiveDate } from './utils/date';
import './index.css';

function CalendarApp() {
  const { step } = useDayStart();
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [currentDate, setCurrentDate] = useState(() => getEffectiveDate());

  const handleNavigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(getEffectiveDate());
      return;
    }

    const delta = direction === 'next' ? 1 : -1;

    switch (currentView) {
      case 'today':
        setCurrentDate(prev => addDays(prev, delta));
        break;
      case '3day':
        setCurrentDate(prev => addDays(prev, delta * 3));
        break;
      case '5day':
        setCurrentDate(prev => addDays(prev, delta * 5));
        break;
      case '7day':
        setCurrentDate(prev => addDays(prev, delta * 7));
        break;
      case '30day':
        setCurrentDate(prev => {
          const newDate = new Date(prev);
          newDate.setMonth(newDate.getMonth() + delta);
          return newDate;
        });
        break;
      case 'year':
        setCurrentDate(prev => {
          const newDate = new Date(prev);
          newDate.setFullYear(newDate.getFullYear() + delta);
          return newDate;
        });
        break;
    }
  }, [currentView]);

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    // Reset to effective today when changing views
    if (view === 'today') {
      setCurrentDate(getEffectiveDate());
    }
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView date={currentDate} />;
      case '3day':
        return <MultiDayView startDate={currentDate} days={3} />;
      case '5day':
        return <MultiDayView startDate={currentDate} days={5} />;
      case '7day':
        return <MultiDayView startDate={startOfWeek(currentDate)} days={7} />;
      case '30day':
        return <MonthView date={currentDate} />;
      case 'year':
        return <YearView year={currentDate.getFullYear()} />;
      default:
        return <TodayView date={currentDate} />;
    }
  };

  // Show the "Start Day" overlay if day hasn't been fully configured
  if (step !== 'complete') {
    return <StartDayOverlay />;
  }

  return (
    <div
      className="h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-background)' }}
    >
      <Header
        currentView={currentView}
        onViewChange={handleViewChange}
        currentDate={currentDate}
        onNavigate={handleNavigate}
      />
      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DayStartProvider>
        <TaskProvider>
          <CalendarApp />
        </TaskProvider>
      </DayStartProvider>
    </ThemeProvider>
  );
}

export default App;
