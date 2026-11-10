import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Award, Calendar, CheckCircle2, Flame, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateStreakSummary } from '../utils/analyticsEngine';
import {
  formatDurationHuman,
  formatShortDate,
  getRecentDateKeys,
  toLocalDateKey,
} from '../utils/dateUtils';

export const StreaksPage: React.FC = () => {
  const { sessions, dailyGoal } = useApp();
  const todayKey = toLocalDateKey(new Date());

  const streakSummary = useMemo(
    () => calculateStreakSummary(sessions, todayKey),
    [sessions, todayKey]
  );

  const last28DateKeys = useMemo(() => getRecentDateKeys(28, todayKey), [todayKey]);

  const weeklyGoalTargetMinutes = Math.max(1, dailyGoal.target_minutes || 120) * 7;
  const last7Keys = useMemo(() => getRecentDateKeys(7, todayKey), [todayKey]);
  const weeklyFocusSeconds = useMemo(() => {
    return last7Keys.reduce(
      (acc, k) => acc + (streakSummary.activeDateMap[k]?.focusSeconds || 0),
      0
    );
  }, [last7Keys, streakSummary]);

  const weeklyFocusMinutes = Math.round(weeklyFocusSeconds / 60);
  const weeklyGoalPct = Math.min(
    100,
    Math.round((weeklyFocusMinutes / weeklyGoalTargetMinutes) * 100)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            Study Streaks & Consistency
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            A productive day is a local calendar day with at least one completed focus session
          </p>
        </div>
        <Link
          to="/achievements"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>View Achievements</span>
        </Link>
      </div>

      {/* Primary Streak Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Current Streak</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {streakSummary.currentStreak}{' '}
            <span className="text-sm font-normal text-slate-500">days</span>
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {streakSummary.activeToday
              ? 'Active today · Streak secured'
              : 'Complete 1 focus session today'}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Longest Streak</span>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {streakSummary.longestStreak}{' '}
            <span className="text-sm font-normal text-slate-500">days</span>
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Personal all-time record
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Active Days</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {streakSummary.totalActiveDays}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Active on {streakSummary.weeklyActiveDays} of last 7 days
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Monthly Consistency</span>
            <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-3 text-3xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {streakSummary.monthlyConsistencyPercent}%
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Last 30 calendar days
          </p>
        </div>
      </section>

      {/* Weekly Goal Progress */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Weekly Goal Progress
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Based on your {dailyGoal.target_minutes}m daily focus target (
              {weeklyGoalTargetMinutes}m / week)
            </p>
          </div>
          <span className="text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
            {weeklyFocusMinutes}m / {weeklyGoalTargetMinutes}m ({weeklyGoalPct}%)
          </span>
        </div>
        <div className="mt-4 h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${weeklyGoalPct}%` }}
          />
        </div>
      </section>

      {/* 28-Day Productive Activity Calendar */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Last 28 Days Activity Log
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Opening the app, starting a timer, or taking a break never counts — only completed
              focus sessions
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {last28DateKeys.map((dateKey) => {
            const record = streakSummary.activeDateMap[dateKey];
            const isActive = Boolean(record && record.sessionsCount > 0);
            const isToday = dateKey === todayKey;

            return (
              <div
                key={dateKey}
                className={`p-3 rounded-lg border transition-colors ${
                  isActive
                    ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60'
                    : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/70 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span
                    className={`font-medium ${
                      isToday
                        ? 'text-blue-600 dark:text-blue-400 font-semibold'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {formatShortDate(dateKey)}
                  </span>
                  {isActive && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="mt-2 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {isActive ? formatDurationHuman(record.focusSeconds) : '0m'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {isActive
                    ? `${record.sessionsCount} ${
                        record.sessionsCount === 1 ? 'session' : 'sessions'
                      }`
                    : 'Inactive'}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
