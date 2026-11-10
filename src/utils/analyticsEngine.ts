import {
  AchievementDefinition,
  AchievementKey,
  FocusSession,
  SmartInsight,
  StreakSummary,
  Subject,
  SubjectStats,
  Task,
} from '../types';
import {
  addDaysToKey,
  diffCalendarDays,
  formatDurationHuman,
  formatShortDate,
  formatWeekdayShort,
  getRecentDateKeys,
  parseLocalDateKey,
  toLocalDateKey,
} from './dateUtils';

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    key: 'first_focus',
    title: 'First Focus',
    description: 'Complete your first focus session.',
    targetValue: 1,
    unitLabel: 'session',
  },
  {
    key: 'getting_started',
    title: 'Getting Started',
    description: 'Complete five focused study sessions.',
    targetValue: 5,
    unitLabel: 'sessions',
  },
  {
    key: 'consistent_learner',
    title: 'Consistent Learner',
    description: 'Reach seven active productive days.',
    targetValue: 7,
    unitLabel: 'active days',
  },
  {
    key: 'task_master',
    title: 'Task Master',
    description: 'Complete 25 tasks across your workspace.',
    targetValue: 25,
    unitLabel: 'tasks',
  },
  {
    key: 'focus_champion',
    title: 'Focus Champion',
    description: 'Complete 100 focused study sessions.',
    targetValue: 100,
    unitLabel: 'sessions',
  },
];

/**
 * Deduplicates and filters strictly for valid, completed focus sessions.
 * Excludes short_break, long_break, and abandoned sessions.
 */
export function getValidCompletedFocusSessions(sessions: FocusSession[]): FocusSession[] {
  const seenIds = new Set<string>();
  const valid: FocusSession[] = [];

  for (const s of sessions) {
    if (!s || !s.id) continue;
    if (seenIds.has(s.id)) continue;
    if (s.session_type !== 'focus') continue;
    if (s.status !== 'completed') continue;
    if (typeof s.duration_seconds !== 'number' || s.duration_seconds <= 0) continue;
    seenIds.add(s.id);
    valid.push(s);
  }

  return valid.sort(
    (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  );
}

/**
 * Calculates streak metrics from actual completed focus sessions.
 * A productive day is a local calendar day with at least 1 completed focus session.
 */
export function calculateStreakSummary(
  sessions: FocusSession[],
  todayKey: string = toLocalDateKey(new Date()),
  timeZone?: string
): StreakSummary {
  const validFocus = getValidCompletedFocusSessions(sessions);
  const activeDateMap: Record<string, { focusSeconds: number; sessionsCount: number }> = {};

  for (const session of validFocus) {
    const key = toLocalDateKey(session.completed_at || session.started_at, timeZone);
    if (!key) continue;
    if (!activeDateMap[key]) {
      activeDateMap[key] = { focusSeconds: 0, sessionsCount: 0 };
    }
    activeDateMap[key].focusSeconds += session.duration_seconds;
    activeDateMap[key].sessionsCount += 1;
  }

  const sortedActiveKeys = Object.keys(activeDateMap).sort();
  const totalActiveDays = sortedActiveKeys.length;
  const activeToday = Boolean(activeDateMap[todayKey]);

  // Calculate Longest Streak
  let longestStreak = 0;
  let runningStreak = 0;
  for (let i = 0; i < sortedActiveKeys.length; i++) {
    if (i === 0) {
      runningStreak = 1;
    } else {
      const diff = diffCalendarDays(sortedActiveKeys[i], sortedActiveKeys[i - 1]);
      if (diff === 1) {
        runningStreak += 1;
      } else if (diff > 1) {
        runningStreak = 1;
      }
    }
    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
  }

  // Calculate Current Streak (active today OR active yesterday continues the streak)
  let currentStreak = 0;
  const yesterdayKey = addDaysToKey(todayKey, -1);
  let cursorKey = activeDateMap[todayKey]
    ? todayKey
    : activeDateMap[yesterdayKey]
    ? yesterdayKey
    : null;

  while (cursorKey && activeDateMap[cursorKey]) {
    currentStreak += 1;
    cursorKey = addDaysToKey(cursorKey, -1);
  }

  // Last 7 days active count
  const last7Keys = getRecentDateKeys(7, todayKey);
  const weeklyActiveDays = last7Keys.filter((k) => Boolean(activeDateMap[k])).length;

  // Last 30 days consistency percentage
  const last30Keys = getRecentDateKeys(30, todayKey);
  const activeInLast30 = last30Keys.filter((k) => Boolean(activeDateMap[k])).length;
  const monthlyConsistencyPercent = Math.round((activeInLast30 / 30) * 100);

  return {
    currentStreak,
    longestStreak,
    totalActiveDays,
    activeToday,
    weeklyActiveDays,
    monthlyConsistencyPercent,
    activeDateMap,
  };
}

/**
 * Computes subject-level statistics from actual completed focus sessions and tasks.
 */
export function calculateSubjectStats(
  subjects: Subject[],
  sessions: FocusSession[],
  tasks: Task[]
): SubjectStats[] {
  const validFocus = getValidCompletedFocusSessions(sessions);

  return subjects.map((subject) => {
    const subjectSessions = validFocus.filter((s) => s.subject_id === subject.id);
    const totalFocusSeconds = subjectSessions.reduce((acc, s) => acc + s.duration_seconds, 0);
    const completedFocusSessions = subjectSessions.length;

    const subjectTasks = tasks.filter((t) => t.subject_id === subject.id);
    const completedTasks = subjectTasks.filter((t) => t.status === 'completed').length;
    const pendingTasks = subjectTasks.filter((t) => t.status === 'pending').length;

    return {
      subject,
      totalFocusSeconds,
      completedFocusSessions,
      totalTasks: subjectTasks.length,
      completedTasks,
      pendingTasks,
    };
  });
}

/**
 * Evaluates which achievements are unlocked based on real records, returning their progress.
 */
export function evaluateAchievementProgress(
  sessions: FocusSession[],
  tasks: Task[],
  todayKey: string = toLocalDateKey(new Date())
): Record<AchievementKey, { currentValue: number; targetValue: number; unlocked: boolean }> {
  const validFocus = getValidCompletedFocusSessions(sessions);
  const streakSummary = calculateStreakSummary(validFocus, todayKey);
  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const completedSessionsCount = validFocus.length;

  return {
    first_focus: {
      currentValue: Math.min(completedSessionsCount, 1),
      targetValue: 1,
      unlocked: completedSessionsCount >= 1,
    },
    getting_started: {
      currentValue: Math.min(completedSessionsCount, 5),
      targetValue: 5,
      unlocked: completedSessionsCount >= 5,
    },
    consistent_learner: {
      currentValue: Math.min(streakSummary.totalActiveDays, 7),
      targetValue: 7,
      unlocked: streakSummary.totalActiveDays >= 7,
    },
    task_master: {
      currentValue: Math.min(completedTasksCount, 25),
      targetValue: 25,
      unlocked: completedTasksCount >= 25,
    },
    focus_champion: {
      currentValue: Math.min(completedSessionsCount, 100),
      targetValue: 100,
      unlocked: completedSessionsCount >= 100,
    },
  };
}

export interface AnalyticsRangeSummary {
  totalFocusSeconds: number;
  totalFocusHours: number;
  completedSessionsCount: number;
  averageSessionMinutes: number;
  todayFocusSeconds: number;
  weeklyFocusSeconds: number;
  monthlyFocusSeconds: number;
  completedTasksCount: number;
  totalTasksCount: number;
  taskCompletionPercentage: number;
  dailyActivitySeries: Array<{
    dateKey: string;
    label: string;
    weekday: string;
    minutes: number;
    hours: number;
    sessions: number;
  }>;
  weeklySeries: Array<{
    weekLabel: string;
    minutes: number;
    hours: number;
    sessions: number;
  }>;
  monthlySeries: Array<{
    dateKey: string;
    label: string;
    minutes: number;
    sessions: number;
  }>;
  subjectDistribution: Array<{
    subjectId: string;
    name: string;
    minutes: number;
    hours: number;
    percentage: number;
    sessions: number;
  }>;
  weekdayProductivity: Array<{
    weekday: string;
    minutes: number;
    sessions: number;
  }>;
  taskStatusBreakdown: Array<{
    name: string;
    count: number;
  }>;
}

export function computeAnalyticsSummary(
  sessions: FocusSession[],
  tasks: Task[],
  subjects: Subject[],
  rangeDays: number = 7,
  todayKey: string = toLocalDateKey(new Date())
): AnalyticsRangeSummary {
  const validFocus = getValidCompletedFocusSessions(sessions);
  const rangeKeys = new Set(getRecentDateKeys(rangeDays, todayKey));
  const last7Keys = new Set(getRecentDateKeys(7, todayKey));
  const last30Keys = new Set(getRecentDateKeys(30, todayKey));

  let todayFocusSeconds = 0;
  let weeklyFocusSeconds = 0;
  let monthlyFocusSeconds = 0;

  const byDateKey: Record<string, { seconds: number; sessions: number }> = {};

  for (const s of validFocus) {
    const key = toLocalDateKey(s.completed_at || s.started_at);
    if (!key) continue;
    if (!byDateKey[key]) {
      byDateKey[key] = { seconds: 0, sessions: 0 };
    }
    byDateKey[key].seconds += s.duration_seconds;
    byDateKey[key].sessions += 1;

    if (key === todayKey) todayFocusSeconds += s.duration_seconds;
    if (last7Keys.has(key)) weeklyFocusSeconds += s.duration_seconds;
    if (last30Keys.has(key)) monthlyFocusSeconds += s.duration_seconds;
  }

  const filteredSessions =
    rangeDays > 0
      ? validFocus.filter((s) => rangeKeys.has(toLocalDateKey(s.completed_at || s.started_at)))
      : validFocus;

  const totalFocusSeconds = filteredSessions.reduce((acc, s) => acc + s.duration_seconds, 0);
  const completedSessionsCount = filteredSessions.length;
  const averageSessionMinutes =
    completedSessionsCount > 0 ? Math.round(totalFocusSeconds / 60 / completedSessionsCount) : 0;

  // Daily series across selected range (default 7 or 14 or 30)
  const displayDaysCount = rangeDays > 0 ? rangeDays : 14;
  const dailyKeys = getRecentDateKeys(displayDaysCount, todayKey);
  const dailyActivitySeries = dailyKeys.map((dateKey) => {
    const entry = byDateKey[dateKey] || { seconds: 0, sessions: 0 };
    const minutes = Math.round(entry.seconds / 60);
    return {
      dateKey,
      label: formatShortDate(dateKey),
      weekday: formatWeekdayShort(dateKey),
      minutes,
      hours: Number((entry.seconds / 3600).toFixed(2)),
      sessions: entry.sessions,
    };
  });

  // Weekly study duration (last 4 weeks)
  const weeklySeries: Array<{
    weekLabel: string;
    minutes: number;
    hours: number;
    sessions: number;
  }> = [];

  for (let w = 3; w >= 0; w--) {
    const weekEndKey = addDaysToKey(todayKey, -w * 7);
    const weekStartKey = addDaysToKey(weekEndKey, -6);
    const weekKeys = getRecentDateKeys(7, weekEndKey);
    let weekSeconds = 0;
    let weekSessions = 0;
    for (const k of weekKeys) {
      if (byDateKey[k]) {
        weekSeconds += byDateKey[k].seconds;
        weekSessions += byDateKey[k].sessions;
      }
    }
    weeklySeries.push({
      weekLabel: `${formatShortDate(weekStartKey)} – ${formatShortDate(weekEndKey)}`,
      minutes: Math.round(weekSeconds / 60),
      hours: Number((weekSeconds / 3600).toFixed(1)),
      sessions: weekSessions,
    });
  }

  // Monthly series (last 30 days)
  const monthKeys = getRecentDateKeys(30, todayKey);
  const monthlySeries = monthKeys.map((dateKey) => {
    const entry = byDateKey[dateKey] || { seconds: 0, sessions: 0 };
    return {
      dateKey,
      label: formatShortDate(dateKey),
      minutes: Math.round(entry.seconds / 60),
      sessions: entry.sessions,
    };
  });

  // Subject distribution inside selected range
  const subjectMap = new Map<string, string>();
  for (const sub of subjects) {
    subjectMap.set(sub.id, sub.name);
  }

  const subjectTotals: Record<string, { seconds: number; sessions: number; name: string }> = {};
  for (const s of filteredSessions) {
    const subId = s.subject_id && subjectMap.has(s.subject_id) ? s.subject_id : 'unassigned';
    const subName =
      s.subject_id && subjectMap.has(s.subject_id)
        ? subjectMap.get(s.subject_id)!
        : 'Unassigned';
    if (!subjectTotals[subId]) {
      subjectTotals[subId] = { seconds: 0, sessions: 0, name: subName };
    }
    subjectTotals[subId].seconds += s.duration_seconds;
    subjectTotals[subId].sessions += 1;
  }

  const subjectDistribution = Object.entries(subjectTotals)
    .map(([subjectId, item]) => ({
      subjectId,
      name: item.name,
      minutes: Math.round(item.seconds / 60),
      hours: Number((item.seconds / 3600).toFixed(1)),
      percentage:
        totalFocusSeconds > 0 ? Math.round((item.seconds / totalFocusSeconds) * 100) : 0,
      sessions: item.sessions,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  // Most productive days of week
  const weekdaysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekdayMap: Record<string, { seconds: number; sessions: number }> = {
    Mon: { seconds: 0, sessions: 0 },
    Tue: { seconds: 0, sessions: 0 },
    Wed: { seconds: 0, sessions: 0 },
    Thu: { seconds: 0, sessions: 0 },
    Fri: { seconds: 0, sessions: 0 },
    Sat: { seconds: 0, sessions: 0 },
    Sun: { seconds: 0, sessions: 0 },
  };

  for (const s of filteredSessions) {
    const key = toLocalDateKey(s.completed_at || s.started_at);
    if (!key) continue;
    const dayName = parseLocalDateKey(key).toLocaleDateString('en-US', { weekday: 'short' });
    if (weekdayMap[dayName]) {
      weekdayMap[dayName].seconds += s.duration_seconds;
      weekdayMap[dayName].sessions += 1;
    }
  }

  const weekdayProductivity = weekdaysOrder.map((day) => ({
    weekday: day,
    minutes: Math.round(weekdayMap[day].seconds / 60),
    sessions: weekdayMap[day].sessions,
  }));

  const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
  const totalTasksCount = tasks.length;
  const pendingTasksCount = totalTasksCount - completedTasksCount;
  const taskCompletionPercentage =
    totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return {
    totalFocusSeconds,
    totalFocusHours: Number((totalFocusSeconds / 3600).toFixed(1)),
    completedSessionsCount,
    averageSessionMinutes,
    todayFocusSeconds,
    weeklyFocusSeconds,
    monthlyFocusSeconds,
    completedTasksCount,
    totalTasksCount,
    taskCompletionPercentage,
    dailyActivitySeries,
    weeklySeries,
    monthlySeries,
    subjectDistribution,
    weekdayProductivity,
    taskStatusBreakdown: [
      { name: 'Completed', count: completedTasksCount },
      { name: 'Pending', count: pendingTasksCount },
    ],
  };
}

/**
 * Generates rule-based productivity insights strictly derived from real user records.
 * Never fabricates insights or claims AI generation.
 */
export function generateSmartInsights(
  sessions: FocusSession[],
  subjects: Subject[],
  dailyGoalMinutes: number,
  todayKey: string = toLocalDateKey(new Date())
): SmartInsight[] {
  const validFocus = getValidCompletedFocusSessions(sessions);
  const streakSummary = calculateStreakSummary(validFocus, todayKey);
  const analyticsAll = computeAnalyticsSummary(validFocus, [], subjects, 30, todayKey);

  // 1. Most Productive Study Day
  const activeWeekdays = [...analyticsAll.weekdayProductivity].sort((a, b) => b.minutes - a.minutes);
  const topDay = activeWeekdays[0];
  const peakDayInsight: SmartInsight =
    validFocus.length > 0 && topDay && topDay.minutes > 0
      ? {
          id: 'peak_day',
          category: 'peak_day',
          title: 'Most Productive Study Day',
          summary: `${topDay.weekday} is your strongest day of the week with ${topDay.minutes} minutes across ${topDay.sessions} completed focus ${topDay.sessions === 1 ? 'session' : 'sessions'} in the last 30 days.`,
          metricLabel: `${topDay.weekday} · ${topDay.minutes}m`,
          hasSufficientData: true,
        }
      : {
          id: 'peak_day',
          category: 'peak_day',
          title: 'Most Productive Study Day',
          summary: 'Complete at least one focus session to identify which day of the week you focus longest.',
          metricLabel: 'More activity required',
          hasSufficientData: false,
        };

  // 2. Most Studied Subject
  const topSubject = analyticsAll.subjectDistribution[0];
  const topSubjectInsight: SmartInsight =
    validFocus.length > 0 && topSubject && topSubject.minutes > 0
      ? {
          id: 'top_subject',
          category: 'top_subject',
          title: 'Most Studied Subject',
          summary: `${topSubject.name} accounts for ${topSubject.percentage}% of your recent study time (${topSubject.minutes} minutes across ${topSubject.sessions} ${topSubject.sessions === 1 ? 'session' : 'sessions'}).`,
          metricLabel: `${topSubject.name} · ${topSubject.percentage}%`,
          hasSufficientData: true,
        }
      : {
          id: 'top_subject',
          category: 'top_subject',
          title: 'Most Studied Subject',
          summary: 'Assign a subject to your focus sessions to compare time invested across topics.',
          metricLabel: 'More activity required',
          hasSufficientData: false,
        };

  // 3. Average Focus Duration
  const avgLengthInsight: SmartInsight =
    validFocus.length > 0
      ? {
          id: 'session_length',
          category: 'session_length',
          title: 'Average Focus Duration',
          summary: `Across ${validFocus.length} completed focus ${validFocus.length === 1 ? 'session' : 'sessions'}, your average uninterrupted work block is ${Math.round(
            validFocus.reduce((a, b) => a + b.duration_seconds, 0) / 60 / validFocus.length
          )} minutes.`,
          metricLabel: `${Math.round(
            validFocus.reduce((a, b) => a + b.duration_seconds, 0) / 60 / validFocus.length
          )} min / session`,
          hasSufficientData: true,
        }
      : {
          id: 'session_length',
          category: 'session_length',
          title: 'Average Focus Duration',
          summary: 'Complete your first focus session to calculate your average session length.',
          metricLabel: 'No sessions recorded',
          hasSufficientData: false,
        };

  // 4. Weekly Productivity Comparison (Current 7 days vs Previous 7 days)
  const currentWeekKeys = new Set(getRecentDateKeys(7, todayKey));
  const prevWeekEndKey = addDaysToKey(todayKey, -7);
  const prevWeekKeys = new Set(getRecentDateKeys(7, prevWeekEndKey));

  let currentWeekSec = 0;
  let prevWeekSec = 0;
  for (const s of validFocus) {
    const k = toLocalDateKey(s.completed_at || s.started_at);
    if (currentWeekKeys.has(k)) currentWeekSec += s.duration_seconds;
    else if (prevWeekKeys.has(k)) prevWeekSec += s.duration_seconds;
  }

  let weeklyTrendInsight: SmartInsight;
  if (currentWeekSec === 0 && prevWeekSec === 0) {
    weeklyTrendInsight = {
      id: 'weekly_trend',
      category: 'weekly_trend',
      title: 'Weekly Productivity Comparison',
      summary: 'More activity over the past two weeks is required to compare week-over-week study volume.',
      metricLabel: 'More activity required',
      hasSufficientData: false,
    };
  } else if (prevWeekSec === 0) {
    weeklyTrendInsight = {
      id: 'weekly_trend',
      category: 'weekly_trend',
      title: 'Weekly Productivity Comparison',
      summary: `You logged ${formatDurationHuman(currentWeekSec)} over the last 7 days compared to 0m the prior week.`,
      metricLabel: `${formatDurationHuman(currentWeekSec)} this week`,
      hasSufficientData: true,
    };
  } else {
    const deltaPct = Math.round(((currentWeekSec - prevWeekSec) / prevWeekSec) * 100);
    const direction = deltaPct >= 0 ? `up ${deltaPct}%` : `down ${Math.abs(deltaPct)}%`;
    weeklyTrendInsight = {
      id: 'weekly_trend',
      category: 'weekly_trend',
      title: 'Weekly Productivity Comparison',
      summary: `Your focus duration over the last 7 days (${formatDurationHuman(currentWeekSec)}) is ${direction} compared to the previous 7 days (${formatDurationHuman(prevWeekSec)}).`,
      metricLabel: `${deltaPct >= 0 ? '+' : ''}${deltaPct}% vs prior week`,
      hasSufficientData: true,
    };
  }

  // 5. Consistency Trends
  const consistencyInsight: SmartInsight =
    streakSummary.totalActiveDays > 0
      ? {
          id: 'consistency',
          category: 'consistency',
          title: 'Consistency Trend',
          summary: `You have been active on ${streakSummary.weeklyActiveDays} of the last 7 days (${streakSummary.monthlyConsistencyPercent}% monthly consistency) with a current streak of ${streakSummary.currentStreak} ${streakSummary.currentStreak === 1 ? 'day' : 'days'}.`,
          metricLabel: `${streakSummary.weeklyActiveDays}/7 days active`,
          hasSufficientData: true,
        }
      : {
          id: 'consistency',
          category: 'consistency',
          title: 'Consistency Trend',
          summary: 'Complete focus sessions on multiple calendar days to measure your habit consistency.',
          metricLabel: '0/7 days active',
          hasSufficientData: false,
        };

  // 6. Progress Towards Weekly Goals
  const weeklyGoalMinutes = Math.max(1, dailyGoalMinutes) * 7;
  const currentWeekMinutes = Math.round(currentWeekSec / 60);
  const weeklyGoalPct = Math.min(100, Math.round((currentWeekMinutes / weeklyGoalMinutes) * 100));

  const goalProgressInsight: SmartInsight = {
    id: 'goal_progress',
    category: 'goal_progress',
    title: 'Weekly Goal Progress',
    summary:
      currentWeekMinutes > 0
        ? `You have completed ${currentWeekMinutes} of your ${weeklyGoalMinutes} weekly target minutes (${weeklyGoalPct}% based on your ${dailyGoalMinutes}m daily goal).`
        : `Your weekly target is ${weeklyGoalMinutes} minutes (${dailyGoalMinutes}m/day). Start a focus session to begin tracking weekly goal completion.`,
    metricLabel: `${currentWeekMinutes}m / ${weeklyGoalMinutes}m (${weeklyGoalPct}%)`,
    hasSufficientData: currentWeekMinutes > 0,
  };

  return [
    peakDayInsight,
    topSubjectInsight,
    avgLengthInsight,
    weeklyTrendInsight,
    consistencyInsight,
    goalProgressInsight,
  ];
}
