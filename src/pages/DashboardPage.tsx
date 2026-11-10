import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Play,
  Plus,
  Target,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  calculateStreakSummary,
  computeAnalyticsSummary,
  getValidCompletedFocusSessions,
} from '../utils/analyticsEngine';
import {
  formatDurationHuman,
  formatReadableDate,
  formatShortDate,
  getTimeGreeting,
  isTaskOverdue,
  toLocalDateKey,
} from '../utils/dateUtils';

export const DashboardPage: React.FC = () => {
  const { profile, dailyGoal, tasks, sessions, subjects, timer } = useApp();
  const navigate = useNavigate();

  const now = new Date();
  const todayKey = toLocalDateKey(now);
  const greeting = getTimeGreeting(now);
  const readableDate = formatReadableDate(now);

  const validFocusSessions = getValidCompletedFocusSessions(sessions);
  const todaySessions = validFocusSessions.filter(
    (s) => toLocalDateKey(s.completed_at || s.started_at) === todayKey
  );
  const todayFocusSeconds = todaySessions.reduce((acc, s) => acc + s.duration_seconds, 0);
  const todayFocusMinutes = Math.round(todayFocusSeconds / 60);

  const goalTargetMinutes = Math.max(1, dailyGoal.target_minutes || 120);
  const dailyGoalProgressPct = Math.min(
    100,
    Math.round((todayFocusMinutes / goalTargetMinutes) * 100)
  );

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const remainingTasks = tasks.filter((t) => t.status === 'pending');

  const streakSummary = calculateStreakSummary(validFocusSessions, todayKey);
  const weeklyAnalytics = computeAnalyticsSummary(validFocusSessions, tasks, subjects, 7, todayKey);

  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const taskMap = new Map(tasks.map((t) => [t.id, t.title]));

  // Upcoming deadlines (pending tasks with due_date, sorted soonest first)
  const upcomingDeadlines = [...remainingTasks]
    .filter((t) => Boolean(t.due_date))
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 5);

  const recentSessions = validFocusSessions.slice(0, 5);

  const handleQuickStartFocus = () => {
    if (timer.status === 'idle') {
      timer.startTimer();
    }
    navigate('/timer');
  };

  return (
    <div className="space-y-8">
      {/* Hero Greeting & Quick-Start Focus Bar */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {readableDate}
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display">
            {greeting}, {profile.display_name}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {todayFocusMinutes > 0
              ? `You have focused for ${formatDurationHuman(todayFocusSeconds)} across ${
                  todaySessions.length
                } ${todaySessions.length === 1 ? 'session' : 'sessions'} today.`
              : 'Ready to begin your first focused study session today?'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/tasks"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Link>
          <button
            type="button"
            onClick={handleQuickStartFocus}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>
              {timer.status === 'running'
                ? 'View Active Timer'
                : timer.status === 'paused'
                ? 'Resume Focus'
                : 'Quick-Start Focus'}
            </span>
          </button>
        </div>
      </section>

      {/* Primary KPI Grid (4 Columns) */}
      <section aria-label="Today's Key Metrics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today's Focus & Daily Goal */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Focus</span>
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {formatDurationHuman(todayFocusSeconds)}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Goal: {goalTargetMinutes}m ({dailyGoalProgressPct}%)
            </span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${dailyGoalProgressPct}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Completed Focus Sessions */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Completed Sessions</span>
            <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {todaySessions.length}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {validFocusSessions.length} total all-time
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Target: <span className="font-mono tabular-nums">{dailyGoal.target_sessions}</span> sessions / day
          </p>
        </div>

        {/* Metric 3: Tasks Overview */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tasks Progress</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {completedTasks.length}
              <span className="text-sm font-normal text-slate-400 dark:text-slate-500">
                {' '}
                / {tasks.length}
              </span>
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {remainingTasks.length} remaining
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {tasks.length > 0
              ? `${Math.round((completedTasks.length / tasks.length) * 100)}% completion rate`
              : 'No tasks created yet'}
          </p>
        </div>

        {/* Metric 4: Current Streak */}
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Current Streak</span>
            <Flame className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {streakSummary.currentStreak}{' '}
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                {streakSummary.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              Best: {streakSummary.longestStreak}d
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {streakSummary.activeToday
              ? 'Today is logged as an active study day'
              : 'Complete 1 focus session to extend streak'}
          </p>
        </div>
      </section>

      {/* Weekly Progress & Daily Activity Strip */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Last 7 Days Focus Progress
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Total weekly focus:{' '}
              <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                {formatDurationHuman(weeklyAnalytics.weeklyFocusSeconds)}
              </span>{' '}
              · Active on{' '}
              <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                {streakSummary.weeklyActiveDays} / 7
              </span>{' '}
              days
            </p>
          </div>
          <Link
            to="/analytics"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
          >
            <span>Detailed Analytics</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 sm:gap-4">
          {weeklyAnalytics.dailyActivitySeries.map((day) => {
            const pctOfDailyGoal = Math.min(
              100,
              Math.round((day.minutes / goalTargetMinutes) * 100)
            );
            const isToday = day.dateKey === todayKey;
            return (
              <div key={day.dateKey} className="flex flex-col items-center">
                <div className="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-800/70 flex items-end p-1 overflow-hidden">
                  <div
                    className={`w-full rounded-sm transition-all duration-300 ${
                      day.minutes > 0
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : 'bg-transparent'
                    }`}
                    style={{ height: `${day.minutes > 0 ? Math.max(10, pctOfDailyGoal) : 0}%` }}
                    title={`${day.label}: ${day.minutes} minutes (${day.sessions} sessions)`}
                  />
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isToday
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {day.weekday}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500">
                  {day.minutes}m
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Two-Column Split: Upcoming Deadlines & Recent Focus Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Upcoming Deadlines */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Upcoming Deadlines
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Pending tasks with scheduled due dates
                </p>
              </div>
              <Link
                to="/tasks"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                View All Tasks
              </Link>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <div className="py-10 text-center">
                <Calendar className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No upcoming deadlines
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Assign a due date to your tasks to monitor approaching deadlines here.
                </p>
                <Link
                  to="/tasks"
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Task with Deadline</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 mt-2">
                {upcomingDeadlines.map((task) => {
                  const overdue = isTaskOverdue(task.due_date, task.status, todayKey);
                  const subjectName = task.subject_id ? subjectMap.get(task.subject_id) : null;
                  return (
                    <div
                      key={task.id}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {task.title}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="capitalize">{task.priority} priority</span>
                          {subjectName && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{subjectName}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`text-xs font-mono tabular-nums font-medium ${
                            overdue
                              ? 'text-red-600 dark:text-red-400'
                              : task.due_date === todayKey
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {overdue
                            ? `Overdue · ${formatShortDate(task.due_date!)}`
                            : task.due_date === todayKey
                            ? 'Due Today'
                            : formatShortDate(task.due_date!)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Recent Study Sessions */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Recent Study Sessions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verified completed focus blocks
                </p>
              </div>
              <Link
                to="/timer"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
              >
                Open Timer
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No completed focus sessions yet
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Start a Pomodoro session to log your study hours and build your daily streak.
                </p>
                <button
                  type="button"
                  onClick={handleQuickStartFocus}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start 25m Focus Session</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800 mt-2">
                {recentSessions.map((session) => {
                  const subjectName = session.subject_id
                    ? subjectMap.get(session.subject_id)
                    : 'General Study';
                  const taskTitle = session.task_id ? taskMap.get(session.task_id) : null;
                  const completedDate = new Date(session.completed_at);

                  return (
                    <div
                      key={session.id}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {taskTitle || subjectName || 'Focused Study Session'}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span>{subjectName || 'Unassigned Subject'}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {completedDate.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at{' '}
                            {completedDate.toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 shrink-0">
                        {formatDurationHuman(session.duration_seconds)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
