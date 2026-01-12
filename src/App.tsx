import { useState, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { DayStartProvider, useDayStart } from './context/DayStartContext';
import { Header } from './components/Header';
import { HomePage } from './components/HomePage';
import { LogoutFlowOverlay } from './components/LogoutFlowOverlay';
import { EnergySelectionOverlay } from './components/EnergySelectionOverlay';
import { RecommendationsOverlay } from './components/RecommendationsOverlay';
import { TodayView, MultiDayView, CompletedView, SettingsView } from './components/views';
import { BottleneckView } from './components/views/BottleneckView';
import { SchedulerView } from './components/views/SchedulerView';
import type { ViewType, DynamicViewConfig } from './types';
import { addDays, getEffectiveDate } from './utils/date';
import './index.css';

function CalendarApp() {
  const { appStep } = useDayStart();
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
      case 'completed':
        return <CompletedView />;
      case 'settings':
        return <SettingsView />;
      case 'dynamic':
        if (dynamicConfig) {
          return <MultiDayView startDate={dynamicConfig.startDate} days={dynamicConfig.days} />;
        }
        return <TodayView date={currentDate} />;
      default:
        return <TodayView date={currentDate} />;
    }
  };

  // Show home page when not logged in (including during login flow)
  if (appStep === 'home' || appStep === 'energy-selection' || appStep === 'recommendations') {
    return (
      <>
        <HomePage />
        {appStep === 'energy-selection' && <EnergySelectionOverlay />}
        {appStep === 'recommendations' && <RecommendationsOverlay />}
      </>
    );
  }

  return (
    <div
      className="h-screen flex flex-col relative"
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
      {/* Settings button in bottom left */}
      {currentView !== 'settings' && (
        <button
          onClick={() => handleViewChange('settings')}
          className="fixed bottom-6 left-6 p-3 rounded-full shadow-lg transition-all hover:scale-110 z-40"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
          }}
          title="Settings"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}
      {/* Show logout flow overlay when logging out */}
      {appStep === 'logout-flow' && <LogoutFlowOverlay />}
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
