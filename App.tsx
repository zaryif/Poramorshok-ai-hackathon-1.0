import React, { useState, useCallback, useRef, useLayoutEffect } from 'react';
import { View } from './types';
import Header from './components/Header';
import Chatbot from './components/Chatbot';
import HealthTracker from './components/HealthTracker';
import DietPlanner from './components/DietPlanner';
import ExercisePlanner from './components/ExercisePlanner';
import HealthWallet from './components/HealthWallet';
import Settings from './components/Settings';
import FunFact from './components/FunFact';
import useScroll from './hooks/useScroll';
import { useReminders } from './contexts/ReminderContext';
import Icon from './components/Icon';
import { useLanguage } from './hooks/useLanguage';

const InAppReminder: React.FC = () => {
    const { activeInAppAlert, dismissInAppAlert } = useReminders();
    const { t } = useLanguage();

    if (!activeInAppAlert) return null;

    const { drugName, dosage, doctor } = activeInAppAlert;

    return (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md p-2 animate-fade-in-up">
            <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-gray-200 dark:border-zinc-800 flex items-start gap-4 p-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Icon name="bell" className="h-6 w-6" />
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{t('reminderAlertTitle')}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        {t('reminderAlertText', { drug: `${drugName} (${dosage})` })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('prescribingDoctor')}: {doctor}
                    </p>
                </div>
                 <button onClick={dismissInAppAlert} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-500 dark:text-gray-400" aria-label={t('cancel')}>
                    <Icon name="plus" className="h-5 w-5 transform rotate-45" />
                </button>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>('chatbot');
  const headerRef = useRef<HTMLHeadElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { isScrolled, scrollDirection } = useScroll(scrollRef);

  useLayoutEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setHeaderHeight(entry.target.getBoundingClientRect().height);
      }
    });

    if (headerRef.current) {
      observer.observe(headerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const renderView = useCallback(() => {
    switch (activeView) {
      case 'tracker':
        return <HealthTracker key="tracker" />;
      case 'diet':
        return <DietPlanner key="diet" />;
      case 'exercise':
        return <ExercisePlanner key="exercise" />;
      case 'wallet':
        return <HealthWallet key="wallet" />;
      case 'settings':
        return <Settings key="settings" />;
      case 'chatbot':
      default:
        return <Chatbot key="chatbot" />;
    }
  }, [activeView]);
  
  return (
    <div className="bg-gray-100 dark:bg-zinc-950 font-sans text-gray-900 dark:text-gray-300">
      <InAppReminder />
      <Header 
        ref={headerRef}
        activeView={activeView} 
        setActiveView={setActiveView}
        isScrolled={isScrolled} 
        scrollDirection={scrollDirection}
      />
      <div ref={scrollRef} className="h-screen overflow-y-auto" style={{ paddingTop: `${headerHeight}px` }}>
        <main className={`px-4 pb-4 transition-all duration-300 ${activeView === 'chatbot' ? 'pb-24' : ''}`}>
          <div className="max-w-7xl mx-auto">
            {renderView()}
          </div>
          <FunFact />
        </main>
      </div>
    </div>
  );
};

export default App;