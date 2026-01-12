import { useState, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { DayStartProvider, useDayStart } from './context/DayStartContext';
import { Header } from './components/Header';
import { StartDayOverlay } from './components/StartDayOverlay';
import { TodayView, MultiDayView } from './components/views';
import { BottleneckView } from './components/views/BottleneckView';
import { SchedulerView } from './components/views/SchedulerView';
import type { ViewType, DynamicViewConfig } from './types';
import { addDays, getEffectiveDate } from './utils/date';
import './index.css';

function CalendarApp() {
  const { step } = useDayStart();
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [currentDate, setCurrentDate] = useState(() => getEffectiveDate());
  const [dynamicConfig, setDynamicConfig] = useState<DynamicViewConfig | null>(null);

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
      case 'dynamic':
        if (dynamicConfig) {
          setCurrentDate(prev => addDays(prev, delta * dynamicConfig.days));
        }
        break;
    }
  }, [currentView, dynamicConfig]);

  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
    // Reset to effective today when changing views
    if (view === 'today') {
      setCurrentDate(getEffectiveDate());
    }
  }, []);

  const handleDynamicViewChange = useCallback((config: DynamicViewConfig) => {
    setDynamicConfig(config);
    setCurrentDate(config.startDate);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView date={currentDate} />;
      case '3day':
        return <MultiDayView startDate={currentDate} days={3} />;
      case 'bottleneck':
        return <BottleneckView />;
      case 'scheduler':
        return <SchedulerView />;
      case 'dynamic':
        if (dynamicConfig) {
          return <MultiDayView startDate={dynamicConfig.startDate} days={dynamicConfig.days} />;
        }
        return <TodayView date={currentDate} />;
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
        dynamicConfig={dynamicConfig}
        onDynamicViewChange={handleDynamicViewChange}
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
        <CalendarApp />
      </DayStartProvider>
    </ThemeProvider>
  );
}

export default App;
