import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type {
  AISettings,
  TaskTimeHistory,
  BreakdownLevel,
  BreakdownFlowState,
  ContextQuestion,
  BreakdownResponse,
  CognitiveLevel,
} from '../types';
import {
  generateContextQuestions,
  generateBreakdown,
  extractTaskKeywords,
  categorizeTask,
  validateApiKey,
} from '../services/ai';

interface AIContextType {
  // Settings
  aiSettings: AISettings;
  updateAISettings: (updates: Partial<AISettings>) => void;
  isApiKeyValid: boolean | null;
  validateKey: () => Promise<boolean>;

  // Time learning data
  timeHistory: TaskTimeHistory[];
  recordTaskCompletion: (
    taskTitle: string,
    cognitiveLevel: CognitiveLevel,
    estimatedMinutes: number,
    actualMinutes: number
  ) => Promise<void>;
  getAccuracyStats: () => { overall: number; byType: Record<string, number> };

  // Breakdown flow
  breakdownFlow: BreakdownFlowState | null;
  startBreakdown: (taskTitle: string, level: BreakdownLevel) => Promise<void>;
  answerQuestion: (questionId: string, selectedOptions: number[]) => void;
  submitAnswersAndGenerate: () => Promise<void>;
  cancelBreakdown: () => void;
  acceptBreakdown: () => BreakdownResponse | null;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  aiSettings: 'aiSettings',
  timeHistory: 'timeHistory',
};

const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  model: 'claude-3-haiku-20240307',
};

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

export function AIProvider({ children }: { children: ReactNode }) {
  const [aiSettings, setAISettings] = useState<AISettings>(() =>
    loadFromStorage(STORAGE_KEYS.aiSettings, DEFAULT_AI_SETTINGS)
  );
  const [timeHistory, setTimeHistory] = useState<TaskTimeHistory[]>(() =>
    loadFromStorage(STORAGE_KEYS.timeHistory, [])
  );
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  const [breakdownFlow, setBreakdownFlow] = useState<BreakdownFlowState | null>(null);
  const [currentQuestions, setCurrentQuestions] = useState<ContextQuestion[]>([]);

  // Validate API key on load if one exists
  useEffect(() => {
    if (aiSettings.apiKey) {
      validateApiKey(aiSettings.apiKey).then(setIsApiKeyValid);
    }
  }, []);

  const updateAISettings = useCallback((updates: Partial<AISettings>) => {
    const updated = { ...aiSettings, ...updates };
    setAISettings(updated);
    saveToStorage(STORAGE_KEYS.aiSettings, updated);

    // Re-validate if API key changed
    if (updates.apiKey !== undefined) {
      if (updates.apiKey) {
        validateApiKey(updates.apiKey).then(setIsApiKeyValid);
      } else {
        setIsApiKeyValid(null);
      }
    }
  }, [aiSettings]);

  const validateKey = useCallback(async (): Promise<boolean> => {
    if (!aiSettings.apiKey) return false;
    const valid = await validateApiKey(aiSettings.apiKey);
    setIsApiKeyValid(valid);
    return valid;
  }, [aiSettings.apiKey]);

  // Record task completion for learning
  const recordTaskCompletion = useCallback(async (
    taskTitle: string,
    cognitiveLevel: CognitiveLevel,
    estimatedMinutes: number,
    actualMinutes: number
  ) => {
    const keywords = extractTaskKeywords(taskTitle);
    let taskType = 'general';

    // Try to categorize with AI if available
    if (aiSettings.apiKey && aiSettings.enabled) {
      try {
        taskType = await categorizeTask(aiSettings.apiKey, taskTitle);
      } catch {
        // Fall back to 'general' if AI fails
      }
    }

    const newEntry: TaskTimeHistory = {
      id: crypto.randomUUID(),
      taskKeywords: keywords,
      taskType,
      cognitiveLevel,
      estimatedMinutes,
      actualMinutes,
      accuracy: estimatedMinutes > 0 ? actualMinutes / estimatedMinutes : 1,
      completedAt: new Date().toISOString(),
    };

    const updated = [...timeHistory, newEntry].slice(-500); // Keep last 500 entries
    setTimeHistory(updated);
    saveToStorage(STORAGE_KEYS.timeHistory, updated);
  }, [aiSettings.apiKey, aiSettings.enabled, timeHistory]);

  // Get accuracy statistics
  const getAccuracyStats = useCallback(() => {
    if (timeHistory.length === 0) {
      return { overall: 1.0, byType: {} };
    }

    const overall = timeHistory.reduce((sum, h) => sum + h.accuracy, 0) / timeHistory.length;

    const byType: Record<string, { sum: number; count: number }> = {};
    timeHistory.forEach(h => {
      if (!byType[h.taskType]) {
        byType[h.taskType] = { sum: 0, count: 0 };
      }
      byType[h.taskType].sum += h.accuracy;
      byType[h.taskType].count += 1;
    });

    const byTypeAvg: Record<string, number> = {};
    Object.entries(byType).forEach(([type, { sum, count }]) => {
      byTypeAvg[type] = sum / count;
    });

    return { overall, byType: byTypeAvg };
  }, [timeHistory]);

  // Start breakdown flow
  const startBreakdown = useCallback(async (taskTitle: string, level: BreakdownLevel) => {
    if (!aiSettings.apiKey) {
      setBreakdownFlow({
        step: 'context-questions',
        taskTitle,
        breakdownLevel: level,
        error: 'Please add your API key in settings first.',
      });
      return;
    }

    setBreakdownFlow({
      step: 'context-questions',
      taskTitle,
      breakdownLevel: level,
    });

    try {
      const questions = await generateContextQuestions(aiSettings.apiKey, taskTitle);
      setCurrentQuestions(questions);
      setBreakdownFlow(prev => prev ? {
        ...prev,
        questions,
        answers: questions.map(q => ({ questionId: q.id, selectedOptions: [] })),
      } : null);
    } catch (error) {
      setBreakdownFlow(prev => prev ? {
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to generate questions',
      } : null);
    }
  }, [aiSettings.apiKey]);

  // Answer a question
  const answerQuestion = useCallback((questionId: string, selectedOptions: number[]) => {
    setBreakdownFlow(prev => {
      if (!prev || !prev.answers) return prev;

      const updatedAnswers = prev.answers.map(a =>
        a.questionId === questionId ? { ...a, selectedOptions } : a
      );

      return { ...prev, answers: updatedAnswers };
    });
  }, []);

  // Submit answers and generate breakdown
  const submitAnswersAndGenerate = useCallback(async () => {
    if (!breakdownFlow || !breakdownFlow.answers || !aiSettings.apiKey) return;

    setBreakdownFlow(prev => prev ? { ...prev, step: 'generating' } : null);

    try {
      const result = await generateBreakdown(
        aiSettings.apiKey,
        {
          taskTitle: breakdownFlow.taskTitle,
          breakdownLevel: breakdownFlow.breakdownLevel,
          contextAnswers: breakdownFlow.answers,
          userTimeHistory: timeHistory,
        },
        currentQuestions
      );

      setBreakdownFlow(prev => prev ? {
        ...prev,
        step: 'review',
        result,
      } : null);
    } catch (error) {
      setBreakdownFlow(prev => prev ? {
        ...prev,
        step: 'context-questions',
        error: error instanceof Error ? error.message : 'Failed to generate breakdown',
      } : null);
    }
  }, [breakdownFlow, aiSettings.apiKey, timeHistory, currentQuestions]);

  // Cancel breakdown
  const cancelBreakdown = useCallback(() => {
    setBreakdownFlow(null);
    setCurrentQuestions([]);
  }, []);

  // Accept breakdown and return result
  const acceptBreakdown = useCallback((): BreakdownResponse | null => {
    const result = breakdownFlow?.result || null;
    setBreakdownFlow(null);
    setCurrentQuestions([]);
    return result;
  }, [breakdownFlow]);

  return (
    <AIContext.Provider value={{
      aiSettings,
      updateAISettings,
      isApiKeyValid,
      validateKey,
      timeHistory,
      recordTaskCompletion,
      getAccuracyStats,
      breakdownFlow,
      startBreakdown,
      answerQuestion,
      submitAnswersAndGenerate,
      cancelBreakdown,
      acceptBreakdown,
    }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
