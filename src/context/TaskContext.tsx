import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Task, Priority } from '../types';

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'order'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (date: string, taskIds: string[]) => void;
  getTasksForDate: (dateString: string) => Task[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

// Sample tasks for demonstration
const generateSampleTasks = (): Task[] => {
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return [
    {
      id: '1',
      title: 'Morning routine',
      description: 'Shower, breakfast, meditation',
      duration: 45,
      priority: 'high' as Priority,
      date: formatDate(today),
      order: 0,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      title: 'Deep work session',
      description: 'Focus on main project',
      duration: 90,
      priority: 'urgent' as Priority,
      date: formatDate(today),
      order: 1,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      title: 'Email & messages',
      duration: 30,
      priority: 'medium' as Priority,
      date: formatDate(today),
      order: 2,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '4',
      title: 'Exercise',
      description: 'Gym or home workout',
      duration: 60,
      priority: 'high' as Priority,
      date: formatDate(today),
      order: 3,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '5',
      title: 'Read a book',
      duration: 30,
      priority: 'low' as Priority,
      date: formatDate(today),
      order: 4,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '6',
      title: 'Weekly planning',
      duration: 45,
      priority: 'medium' as Priority,
      date: formatDate(new Date(today.getTime() + 86400000)),
      order: 0,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '7',
      title: 'Team meeting',
      description: 'Sprint review',
      duration: 60,
      priority: 'urgent' as Priority,
      date: formatDate(new Date(today.getTime() + 86400000)),
      order: 1,
      completed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '8',
      title: 'Grocery shopping',
      duration: 45,
      priority: 'low' as Priority,
      date: formatDate(new Date(today.getTime() + 2 * 86400000)),
      order: 0,
      completed: false,
      createdAt: new Date().toISOString(),
    },
  ];
};

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem('tasks');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return generateSampleTasks();
      }
    }
    return generateSampleTasks();
  });

  const saveTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'order'>) => {
    const tasksForDate = tasks.filter(t => t.date === task.date);
    const maxOrder = tasksForDate.length > 0
      ? Math.max(...tasksForDate.map(t => t.order))
      : -1;

    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      order: maxOrder + 1,
    };
    saveTasks([...tasks, newTask]);
  }, [tasks, saveTasks]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    saveTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
  }, [tasks, saveTasks]);

  const deleteTask = useCallback((id: string) => {
    saveTasks(tasks.filter(t => t.id !== id));
  }, [tasks, saveTasks]);

  const reorderTasks = useCallback((date: string, taskIds: string[]) => {
    saveTasks(tasks.map(t => {
      if (t.date === date) {
        const newOrder = taskIds.indexOf(t.id);
        return newOrder >= 0 ? { ...t, order: newOrder } : t;
      }
      return t;
    }));
  }, [tasks, saveTasks]);

  const getTasksForDate = useCallback((dateString: string) => {
    return tasks
      .filter(t => t.date === dateString)
      .sort((a, b) => a.order - b.order);
  }, [tasks]);

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, deleteTask, reorderTasks, getTasksForDate }}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
}
