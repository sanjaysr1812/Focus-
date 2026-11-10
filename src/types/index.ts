export type PriorityLevel = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed';
export type SessionMode = 'focus' | 'short_break' | 'long_break';
export type SessionStatus = 'completed' | 'abandoned';
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  created_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  description: string;
  icon?: string;
  color?: string;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  priority: PriorityLevel;
  status: TaskStatus;
  subject_id: string | null;
  due_date: string | null; // YYYY-MM-DD or ISO string
  created_at: string;
  completed_at: string | null;
  updated_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  subject_id: string | null;
  task_id: string | null;
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  session_type: SessionMode;
  status: SessionStatus;
  created_at: string;
}

export interface DailyGoal {
  id: string;
  user_id: string;
  target_minutes: number;
  target_sessions: number;
  created_at: string;
  updated_at: string;
}

export type AchievementKey =
  | 'first_focus'
  | 'getting_started'
  | 'consistent_learner'
  | 'task_master'
  | 'focus_champion';

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: AchievementKey;
  unlocked_at: string;
}

export interface AchievementDefinition {
  key: AchievementKey;
  title: string;
  description: string;
  targetValue: number;
  unitLabel: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: ThemeMode;
  focus_duration: number; // in minutes, default 25
  short_break_duration: number; // in minutes, default 5
  long_break_duration: number; // in minutes, default 15
  daily_goal_minutes: number; // default 120
  updated_at: string;
}

export type TimerMachineStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface PersistedTimerState {
  sessionId: string;
  status: TimerMachineStatus;
  mode: SessionMode;
  totalDurationSeconds: number;
  remainingSeconds: number;
  startedAtIso: string | null;
  targetEndTimestampMs: number | null;
  completedFocusCycles: number;
  selectedTaskId: string | null;
  selectedSubjectId: string | null;
  recordedSessionIds: string[];
  lastUpdatedMs: number;
}

export interface SubjectStats {
  subject: Subject;
  totalFocusSeconds: number;
  completedFocusSessions: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  activeToday: boolean;
  weeklyActiveDays: number;
  monthlyConsistencyPercent: number;
  activeDateMap: Record<string, { focusSeconds: number; sessionsCount: number }>;
}

export interface SmartInsight {
  id: string;
  category: 'peak_day' | 'top_subject' | 'session_length' | 'weekly_trend' | 'consistency' | 'goal_progress';
  title: string;
  summary: string;
  metricLabel: string;
  hasSufficientData: boolean;
}
