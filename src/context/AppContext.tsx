import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from './AuthContext';
import { GUEST_USER_ID } from '../database/indexedDb';
import { MigrationReport, storageService } from '../services/storageService';
import {
  Achievement,
  AchievementKey,
  DailyGoal,
  FocusSession,
  PersistedTimerState,
  PriorityLevel,
  Profile,
  SessionMode,
  Subject,
  Task,
  ThemeMode,
  TimerMachineStatus,
  UserPreferences,
} from '../types';
import { evaluateAchievementProgress } from '../utils/analyticsEngine';
import { generateUUID, getUserTimezone, toLocalDateKey } from '../utils/dateUtils';

const TIMER_STORAGE_KEY = 'focusflow_timer_state_v1';
const THEME_STORAGE_KEY = 'focusflow_theme_pref';

interface TimerControls {
  status: TimerMachineStatus;
  mode: SessionMode;
  totalDurationSeconds: number;
  remainingSeconds: number;
  completedFocusCycles: number;
  selectedTaskId: string | null;
  selectedSubjectId: string | null;
  notificationPermission: NotificationPermission | 'unsupported';
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  skipBreak: () => void;
  switchMode: (nextMode: SessionMode) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setSelectedSubjectId: (subjectId: string | null) => void;
  requestNotificationAccess: () => Promise<NotificationPermission | 'unsupported'>;
}

interface AppContextValue {
  loading: boolean;
  error: string | null;
  profile: Profile;
  preferences: UserPreferences;
  dailyGoal: DailyGoal;
  subjects: Subject[];
  tasks: Task[];
  sessions: FocusSession[];
  achievements: Achievement[];
  activeTheme: 'light' | 'dark';
  pendingGuestMigration: {
    hasGuestData: boolean;
    subjectsCount: number;
    tasksCount: number;
    sessionsCount: number;
  };
  timer: TimerControls;
  // Actions
  refreshWorkspace: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  updateProfileInfo: (
    updates: Partial<Pick<Profile, 'username' | 'display_name' | 'timezone' | 'avatar_url'>>
  ) => Promise<void>;
  updateTimerAndGoalPreferences: (updates: {
    focus_duration: number;
    short_break_duration: number;
    long_break_duration: number;
    daily_goal_minutes: number;
    target_sessions?: number;
  }) => Promise<void>;
  createSubject: (input: {
    name: string;
    description: string;
    icon?: string;
    color?: string;
  }) => Promise<Subject>;
  updateSubject: (
    subjectId: string,
    updates: { name: string; description: string; icon?: string; color?: string }
  ) => Promise<Subject>;
  deleteSubject: (subjectId: string) => Promise<void>;
  createTask: (input: {
    title: string;
    description?: string;
    priority: PriorityLevel;
    subject_id: string | null;
    due_date: string | null;
  }) => Promise<Task>;
  updateTask: (
    taskId: string,
    updates: Partial<
      Pick<Task, 'title' | 'description' | 'priority' | 'status' | 'subject_id' | 'due_date'>
    >
  ) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  migrateGuestData: () => Promise<MigrationReport>;
}

const DEFAULT_PROFILE: Profile = {
  id: GUEST_USER_ID,
  username: 'guest',
  display_name: 'Guest Scholar',
  avatar_url: null,
  timezone: getUserTimezone(),
  created_at: new Date().toISOString(),
};

const DEFAULT_PREFS: UserPreferences = {
  id: 'default-prefs',
  user_id: GUEST_USER_ID,
  theme: 'system',
  focus_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  daily_goal_minutes: 120,
  updated_at: new Date().toISOString(),
};

const DEFAULT_GOAL: DailyGoal = {
  id: 'default-goal',
  user_id: GUEST_USER_ID,
  target_minutes: 120,
  target_sessions: 4,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function getDurationForMode(mode: SessionMode, prefs: UserPreferences): number {
  if (mode === 'focus') return Math.max(1, prefs.focus_duration || 25) * 60;
  if (mode === 'short_break') return Math.max(1, prefs.short_break_duration || 5) * 60;
  return Math.max(1, prefs.long_break_duration || 15) * 60;
}

function loadInitialTimerState(prefs: UserPreferences): PersistedTimerState {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedTimerState;
      if (parsed && parsed.sessionId && parsed.mode && parsed.status) {
        return {
          ...parsed,
          recordedSessionIds: Array.isArray(parsed.recordedSessionIds)
            ? parsed.recordedSessionIds
            : [],
        };
      }
    }
  } catch {
    // Ignore storage read errors
  }

  const defaultFocusSec = getDurationForMode('focus', prefs);
  return {
    sessionId: generateUUID(),
    status: 'idle',
    mode: 'focus',
    totalDurationSeconds: defaultFocusSec,
    remainingSeconds: defaultFocusSec,
    startedAtIso: null,
    targetEndTimestampMs: null,
    completedFocusCycles: 0,
    selectedTaskId: null,
    selectedSubjectId: null,
    recordedSessionIds: [],
    lastUpdatedMs: Date.now(),
  };
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, authLoading } = useAuth();
  const effectiveUserId = user?.id ?? null;

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return savedTheme ? { ...DEFAULT_PREFS, theme: savedTheme } : DEFAULT_PREFS;
  });
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(DEFAULT_GOAL);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>('light');
  const [pendingGuestMigration, setPendingGuestMigration] = useState({
    hasGuestData: false,
    subjectsCount: 0,
    tasksCount: 0,
    sessionsCount: 0,
  });

  // Timer state machine
  const [timerState, setTimerState] = useState<PersistedTimerState>(() =>
    loadInitialTimerState(DEFAULT_PREFS)
  );
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  const processingSessionIdsRef = useRef<Set<string>>(new Set());

  // Apply theme to document.documentElement (<html class="dark">)
  useEffect(() => {
    const themePref = preferences.theme || 'system';
    localStorage.setItem(THEME_STORAGE_KEY, themePref);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyResolvedTheme = () => {
      const resolved: 'light' | 'dark' =
        themePref === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themePref;
      setActiveTheme(resolved);
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyResolvedTheme();
    mediaQuery.addEventListener('change', applyResolvedTheme);
    return () => mediaQuery.removeEventListener('change', applyResolvedTheme);
  }, [preferences.theme]);

  // Persist timerState to localStorage on every transition
  useEffect(() => {
    try {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timerState));
    } catch {
      // Ignore quota errors
    }
  }, [timerState]);

  const checkAndUnlockAchievements = useCallback(
    async (
      currentSessions: FocusSession[],
      currentTasks: Task[],
      currentAchievements: Achievement[]
    ) => {
      const progress = evaluateAchievementProgress(
        currentSessions,
        currentTasks,
        toLocalDateKey(new Date())
      );
      const keysToUnlock = (Object.keys(progress) as AchievementKey[]).filter(
        (k) => progress[k].unlocked
      );
      if (keysToUnlock.length === 0) return;

      try {
        const newlyUnlocked = await storageService.unlockAchievements(
          effectiveUserId,
          currentAchievements,
          keysToUnlock
        );
        if (newlyUnlocked.length > 0) {
          setAchievements((prev) => {
            const existingKeys = new Set(prev.map((a) => a.achievement_key));
            const filteredNew = newlyUnlocked.filter((n) => !existingKeys.has(n.achievement_key));
            return [...prev, ...filteredNew];
          });
        }
      } catch {
        // Non-fatal
      }
    },
    [effectiveUserId]
  );

  const refreshWorkspace = useCallback(async () => {
    if (authLoading) return;
    setLoading(true);
    setError(null);
    try {
      const snapshot = await storageService.loadWorkspace(effectiveUserId);
      setProfile(snapshot.profile);
      setPreferences(snapshot.preferences);
      setDailyGoal(snapshot.dailyGoal);
      setSubjects(snapshot.subjects);
      setTasks(snapshot.tasks);
      setSessions(snapshot.sessions);
      setAchievements(snapshot.achievements);

      // Update idle timer duration if preferences changed and timer is currently idle
      setTimerState((prev) => {
        if (prev.status === 'idle') {
          const updatedTotal = getDurationForMode(prev.mode, snapshot.preferences);
          return {
            ...prev,
            totalDurationSeconds: updatedTotal,
            remainingSeconds: updatedTotal,
          };
        }
        return prev;
      });

      await checkAndUnlockAchievements(
        snapshot.sessions,
        snapshot.tasks,
        snapshot.achievements
      );

      if (effectiveUserId) {
        const guestSummary = await storageService.getPendingGuestDataSummary();
        setPendingGuestMigration(guestSummary);
      } else {
        setPendingGuestMigration({
          hasGuestData: false,
          subjectsCount: 0,
          tasksCount: 0,
          sessionsCount: 0,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace data.');
    } finally {
      setLoading(false);
    }
  }, [authLoading, effectiveUserId, checkAndUnlockAchievements]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  // Finalize a completed timer session (Focus or Break)
  const handleSessionCompletion = useCallback(
    async (completedState: PersistedTimerState, completedAtIso: string) => {
      const { sessionId, mode, totalDurationSeconds, startedAtIso, selectedSubjectId, selectedTaskId } =
        completedState;

      // Guard against duplicate recording
      if (
        completedState.recordedSessionIds.includes(sessionId) ||
        processingSessionIdsRef.current.has(sessionId)
      ) {
        return;
      }

      processingSessionIdsRef.current.add(sessionId);

      // Send notification if user explicitly granted permission
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(
            mode === 'focus' ? 'Focus session complete!' : 'Break complete!',
            {
              body:
                mode === 'focus'
                  ? `Great work! You completed a ${Math.round(totalDurationSeconds / 60)}-minute focus session.`
                  : 'Ready to begin your next focus session?',
            }
          );
        } catch {
          // Ignore notification errors in restricted contexts
        }
      }

      if (mode === 'focus') {
        try {
          const savedSession = await storageService.recordCompletedFocusSession(effectiveUserId, {
            id: sessionId,
            subject_id: selectedSubjectId,
            task_id: selectedTaskId,
            started_at:
              startedAtIso ||
              new Date(
                new Date(completedAtIso).getTime() - totalDurationSeconds * 1000
              ).toISOString(),
            completed_at: completedAtIso,
            duration_seconds: totalDurationSeconds,
            session_type: 'focus',
          });

          if (savedSession) {
            setSessions((prev) => {
              if (prev.some((s) => s.id === savedSession.id)) return prev;
              const next = [savedSession, ...prev];
              checkAndUnlockAchievements(next, tasks, achievements);
              return next;
            });
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not save focus session.');
        }
      }
    },
    [effectiveUserId, tasks, achievements, checkAndUnlockAchievements]
  );

  // Absolute-timestamp tick calculation and background/tab recovery
  const syncTimerClock = useCallback(() => {
    setTimerState((prev) => {
      if (prev.status !== 'running' || !prev.targetEndTimestampMs) {
        return prev;
      }

      const nowMs = Date.now();
      const diffMs = prev.targetEndTimestampMs - nowMs;

      if (diffMs <= 0) {
        // Session reached completion!
        const completedAtIso = new Date(prev.targetEndTimestampMs).toISOString();
        const nextCycles =
          prev.mode === 'focus' ? prev.completedFocusCycles + 1 : prev.completedFocusCycles;

        const completedSnapshot: PersistedTimerState = {
          ...prev,
          status: 'completed',
          remainingSeconds: 0,
          targetEndTimestampMs: null,
          completedFocusCycles: nextCycles,
          recordedSessionIds: prev.recordedSessionIds.includes(prev.sessionId)
            ? prev.recordedSessionIds
            : [...prev.recordedSessionIds.slice(-30), prev.sessionId],
          lastUpdatedMs: nowMs,
        };

        // Trigger async record persistence outside state reducer
        queueMicrotask(() => {
          handleSessionCompletion(prev, completedAtIso);
        });

        return completedSnapshot;
      }

      const nextRemaining = Math.max(0, Math.ceil(diffMs / 1000));
      if (nextRemaining === prev.remainingSeconds) {
        return prev;
      }

      return {
        ...prev,
        remainingSeconds: nextRemaining,
        lastUpdatedMs: nowMs,
      };
    });
  }, [handleSessionCompletion]);

  // Run interval when timer is running & attach visibilitychange/focus listeners for instant recalculation
  useEffect(() => {
    // Immediate sync on mount (recovers timer state after refresh or unexpected browser closure)
    syncTimerClock();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncTimerClock();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    let intervalId: number | null = null;
    if (timerState.status === 'running') {
      intervalId = window.setInterval(syncTimerClock, 250);
    }

    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [timerState.status, syncTimerClock]);

  // Timer Controls
  const startTimer = useCallback(() => {
    const nowMs = Date.now();
    setTimerState((prev) => {
      const durationSec = getDurationForMode(prev.mode, preferences);
      const freshSessionId = generateUUID();
      return {
        ...prev,
        sessionId: freshSessionId,
        status: 'running',
        totalDurationSeconds: durationSec,
        remainingSeconds: durationSec,
        startedAtIso: new Date(nowMs).toISOString(),
        targetEndTimestampMs: nowMs + durationSec * 1000,
        lastUpdatedMs: nowMs,
      };
    });
  }, [preferences]);

  const pauseTimer = useCallback(() => {
    const nowMs = Date.now();
    setTimerState((prev) => {
      if (prev.status !== 'running' || !prev.targetEndTimestampMs) return prev;
      const remaining = Math.max(1, Math.ceil((prev.targetEndTimestampMs - nowMs) / 1000));
      return {
        ...prev,
        status: 'paused',
        remainingSeconds: remaining,
        targetEndTimestampMs: null,
        lastUpdatedMs: nowMs,
      };
    });
  }, []);

  const resumeTimer = useCallback(() => {
    const nowMs = Date.now();
    setTimerState((prev) => {
      if (prev.status !== 'paused') return prev;
      return {
        ...prev,
        status: 'running',
        targetEndTimestampMs: nowMs + prev.remainingSeconds * 1000,
        lastUpdatedMs: nowMs,
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    const nowMs = Date.now();
    setTimerState((prev) => {
      // Resetting an incomplete session abandons it without recording
      const durationSec = getDurationForMode(prev.mode, preferences);
      return {
        ...prev,
        sessionId: generateUUID(),
        status: 'idle',
        totalDurationSeconds: durationSec,
        remainingSeconds: durationSec,
        startedAtIso: null,
        targetEndTimestampMs: null,
        lastUpdatedMs: nowMs,
      };
    });
  }, [preferences]);

  const switchMode = useCallback(
    (nextMode: SessionMode) => {
      const nowMs = Date.now();
      const durationSec = getDurationForMode(nextMode, preferences);
      setTimerState((prev) => ({
        ...prev,
        sessionId: generateUUID(),
        status: 'idle',
        mode: nextMode,
        totalDurationSeconds: durationSec,
        remainingSeconds: durationSec,
        startedAtIso: null,
        targetEndTimestampMs: null,
        lastUpdatedMs: nowMs,
      }));
    },
    [preferences]
  );

  const skipBreak = useCallback(() => {
    switchMode('focus');
  }, [switchMode]);

  const setSelectedTaskId = useCallback(
    (taskId: string | null) => {
      setTimerState((prev) => {
        const matchedTask = tasks.find((t) => t.id === taskId);
        const autoSubjectId =
          matchedTask && matchedTask.subject_id ? matchedTask.subject_id : prev.selectedSubjectId;
        return {
          ...prev,
          selectedTaskId: taskId,
          selectedSubjectId: autoSubjectId,
        };
      });
    },
    [tasks]
  );

  const setSelectedSubjectId = useCallback((subjectId: string | null) => {
    setTimerState((prev) => ({
      ...prev,
      selectedSubjectId: subjectId,
    }));
  }, []);

  const requestNotificationAccess = useCallback(async (): Promise<
    NotificationPermission | 'unsupported'
  > => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported');
      return 'unsupported';
    }
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
    return result;
  }, []);

  // Workspace mutation methods
  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      const updated = await storageService.updatePreferences(effectiveUserId, preferences, {
        theme: mode,
      });
      setPreferences(updated);
    },
    [effectiveUserId, preferences]
  );

  const updateProfileInfo = useCallback(
    async (
      updates: Partial<Pick<Profile, 'username' | 'display_name' | 'timezone' | 'avatar_url'>>
    ) => {
      const updated = await storageService.updateProfile(effectiveUserId, updates);
      setProfile(updated);
    },
    [effectiveUserId]
  );

  const updateTimerAndGoalPreferences = useCallback(
    async (updates: {
      focus_duration: number;
      short_break_duration: number;
      long_break_duration: number;
      daily_goal_minutes: number;
      target_sessions?: number;
    }) => {
      const safeFocus = Math.max(1, Math.min(180, Math.round(updates.focus_duration)));
      const safeShort = Math.max(1, Math.min(60, Math.round(updates.short_break_duration)));
      const safeLong = Math.max(1, Math.min(90, Math.round(updates.long_break_duration)));
      const safeGoalMins = Math.max(10, Math.min(960, Math.round(updates.daily_goal_minutes)));

      const updatedPrefs = await storageService.updatePreferences(effectiveUserId, preferences, {
        focus_duration: safeFocus,
        short_break_duration: safeShort,
        long_break_duration: safeLong,
        daily_goal_minutes: safeGoalMins,
      });
      setPreferences(updatedPrefs);

      const updatedGoal = await storageService.updateDailyGoal(effectiveUserId, dailyGoal, {
        target_minutes: safeGoalMins,
        target_sessions: updates.target_sessions ?? dailyGoal.target_sessions,
      });
      setDailyGoal(updatedGoal);

      // Update timer if idle
      setTimerState((prev) => {
        if (prev.status !== 'idle') return prev;
        const nextTotal = getDurationForMode(prev.mode, updatedPrefs);
        return {
          ...prev,
          totalDurationSeconds: nextTotal,
          remainingSeconds: nextTotal,
        };
      });
    },
    [effectiveUserId, preferences, dailyGoal]
  );

  const createSubject = useCallback(
    async (input: { name: string; description: string; icon?: string; color?: string }) => {
      const created = await storageService.createSubject(effectiveUserId, input);
      setSubjects((prev) => [...prev, created]);
      return created;
    },
    [effectiveUserId]
  );

  const updateSubject = useCallback(
    async (
      subjectId: string,
      updates: { name: string; description: string; icon?: string; color?: string }
    ) => {
      const updated = await storageService.updateSubject(effectiveUserId, subjectId, updates);
      setSubjects((prev) => prev.map((s) => (s.id === subjectId ? updated : s)));
      return updated;
    },
    [effectiveUserId]
  );

  const deleteSubject = useCallback(
    async (subjectId: string) => {
      await storageService.deleteSubject(effectiveUserId, subjectId);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
      setTasks((prev) =>
        prev.map((t) => (t.subject_id === subjectId ? { ...t, subject_id: null } : t))
      );
      setSessions((prev) =>
        prev.map((s) => (s.subject_id === subjectId ? { ...s, subject_id: null } : s))
      );
      setTimerState((prev) =>
        prev.selectedSubjectId === subjectId ? { ...prev, selectedSubjectId: null } : prev
      );
    },
    [effectiveUserId]
  );

  const createTask = useCallback(
    async (input: {
      title: string;
      description?: string;
      priority: PriorityLevel;
      subject_id: string | null;
      due_date: string | null;
    }) => {
      const created = await storageService.createTask(effectiveUserId, input);
      setTasks((prev) => [created, ...prev]);
      return created;
    },
    [effectiveUserId]
  );

  const updateTask = useCallback(
    async (
      taskId: string,
      updates: Partial<
        Pick<Task, 'title' | 'description' | 'priority' | 'status' | 'subject_id' | 'due_date'>
      >
    ) => {
      const updated = await storageService.updateTask(effectiveUserId, taskId, updates);
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === taskId ? updated : t));
        checkAndUnlockAchievements(sessions, next, achievements);
        return next;
      });
      return updated;
    },
    [effectiveUserId, sessions, achievements, checkAndUnlockAchievements]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      await storageService.deleteTask(effectiveUserId, taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setTimerState((prev) =>
        prev.selectedTaskId === taskId ? { ...prev, selectedTaskId: null } : prev
      );
    },
    [effectiveUserId]
  );

  const migrateGuestData = useCallback(async (): Promise<MigrationReport> => {
    if (!effectiveUserId) {
      return {
        migratedSubjects: 0,
        migratedTasks: 0,
        migratedSessions: 0,
        migratedAchievements: 0,
        success: false,
        error: 'Please sign in to an authenticated account first.',
      };
    }
    const report = await storageService.migrateGuestDataToAccount(effectiveUserId);
    if (report.success) {
      await refreshWorkspace();
    }
    return report;
  }, [effectiveUserId, refreshWorkspace]);

  const timerControls: TimerControls = useMemo(
    () => ({
      status: timerState.status,
      mode: timerState.mode,
      totalDurationSeconds: timerState.totalDurationSeconds,
      remainingSeconds: timerState.remainingSeconds,
      completedFocusCycles: timerState.completedFocusCycles,
      selectedTaskId: timerState.selectedTaskId,
      selectedSubjectId: timerState.selectedSubjectId,
      notificationPermission,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      skipBreak,
      switchMode,
      setSelectedTaskId,
      setSelectedSubjectId,
      requestNotificationAccess,
    }),
    [
      timerState,
      notificationPermission,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      skipBreak,
      switchMode,
      setSelectedTaskId,
      setSelectedSubjectId,
      requestNotificationAccess,
    ]
  );

  return (
    <AppContext.Provider
      value={{
        loading,
        error,
        profile,
        preferences,
        dailyGoal,
        subjects,
        tasks,
        sessions,
        achievements,
        activeTheme,
        pendingGuestMigration,
        timer: timerControls,
        refreshWorkspace,
        setThemeMode,
        updateProfileInfo,
        updateTimerAndGoalPreferences,
        createSubject,
        updateSubject,
        deleteSubject,
        createTask,
        updateTask,
        deleteTask,
        migrateGuestData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}
