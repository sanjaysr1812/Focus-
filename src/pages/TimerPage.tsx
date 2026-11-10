import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  SkipForward,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SessionMode } from '../types';
import { getValidCompletedFocusSessions } from '../utils/analyticsEngine';
import { formatTimerDisplay, toLocalDateKey } from '../utils/dateUtils';

const MODE_LABELS: Record<SessionMode, string> = {
  focus: 'Focus Session',
  short_break: 'Short Break',
  long_break: 'Long Break',
};

export const TimerPage: React.FC = () => {
  const {
    timer,
    tasks,
    subjects,
    sessions,
    preferences,
    dailyGoal,
    updateTimerAndGoalPreferences,
  } = useApp();

  const [showDurationEditor, setShowDurationEditor] = useState(false);
  const [focusMins, setFocusMins] = useState(preferences.focus_duration);
  const [shortBreakMins, setShortBreakMins] = useState(preferences.short_break_duration);
  const [longBreakMins, setLongBreakMins] = useState(preferences.long_break_duration);
  const [savingDurations, setSavingDurations] = useState(false);

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const todayKey = toLocalDateKey(new Date());
  const todayCompletedSessions = getValidCompletedFocusSessions(sessions).filter(
    (s) => toLocalDateKey(s.completed_at || s.started_at) === todayKey
  );

  const progressFraction =
    timer.totalDurationSeconds > 0
      ? Math.max(
          0,
          Math.min(
            1,
            (timer.totalDurationSeconds - timer.remainingSeconds) / timer.totalDurationSeconds
          )
        )
      : 0;

  // Circular SVG geometry
  const radius = 126;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progressFraction);

  const selectedTask = tasks.find((t) => t.id === timer.selectedTaskId);
  const selectedSubject = subjects.find((s) => s.id === timer.selectedSubjectId);

  const handleSaveCustomDurations = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDurations(true);
    try {
      await updateTimerAndGoalPreferences({
        focus_duration: focusMins,
        short_break_duration: shortBreakMins,
        long_break_duration: longBreakMins,
        daily_goal_minutes: preferences.daily_goal_minutes,
      });
      setShowDurationEditor(false);
    } finally {
      setSavingDurations(false);
    }
  };

  // Suggest Long Break after every 4 completed focus sessions
  const isLongBreakRecommended =
    timer.status === 'completed' &&
    timer.mode === 'focus' &&
    timer.completedFocusCycles > 0 &&
    timer.completedFocusCycles % 4 === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Mode Switcher & Focus Room Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl self-start"
          role="tablist"
          aria-label="Timer Mode Selector"
        >
          {(['focus', 'short_break', 'long_break'] as SessionMode[]).map((modeKey) => {
            const active = timer.mode === modeKey;
            return (
              <button
                key={modeKey}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => timer.switchMode(modeKey)}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {MODE_LABELS[modeKey]}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {timer.notificationPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={timer.requestNotificationAccess}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              title="Configure desktop completion notifications"
            >
              {timer.notificationPermission === 'granted' ? (
                <>
                  <Bell className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Alerts On</span>
                </>
              ) : (
                <>
                  <BellOff className="h-3.5 w-3.5" />
                  <span>Enable Alerts</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setFocusMins(preferences.focus_duration);
              setShortBreakMins(preferences.short_break_duration);
              setLongBreakMins(preferences.long_break_duration);
              setShowDurationEditor((v) => !v);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Durations</span>
          </button>

          <Link
            to="/focus-room"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Focus Room</span>
          </Link>
        </div>
      </div>

      {/* Optional Inline Duration Customizer */}
      {showDurationEditor && (
        <form
          onSubmit={handleSaveCustomDurations}
          className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Customize Pomodoro Durations (Minutes)
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Long break recommended every 4 focus sessions
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="focus-mins-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Focus Duration (min)
              </label>
              <input
                id="focus-mins-input"
                type="number"
                min={1}
                max={180}
                value={focusMins}
                onChange={(e) => setFocusMins(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="short-break-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Short Break (min)
              </label>
              <input
                id="short-break-input"
                type="number"
                min={1}
                max={60}
                value={shortBreakMins}
                onChange={(e) => setShortBreakMins(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label
                htmlFor="long-break-input"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Long Break (min)
              </label>
              <input
                id="long-break-input"
                type="number"
                min={1}
                max={90}
                value={longBreakMins}
                onChange={(e) => setLongBreakMins(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDurationEditor(false)}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingDurations}
              className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              {savingDurations ? 'Saving...' : 'Save Durations'}
            </button>
          </div>
        </form>
      )}

      {/* Main Timer Card */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 flex flex-col items-center">
        {/* Session Mode & Status Subtitle */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>{MODE_LABELS[timer.mode]}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{timer.status}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Today: {todayCompletedSessions.length} / {dailyGoal.target_sessions} sessions
          </span>
        </div>

        {/* Circular Countdown Ring */}
        <div className="relative my-8 flex items-center justify-center">
          <svg className="w-72 h-72 -rotate-90 transform" viewBox="0 0 280 280">
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-100 dark:text-slate-800"
            />
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className={`transition-all duration-300 ${
                timer.mode === 'focus'
                  ? 'text-blue-600 dark:text-blue-500'
                  : 'text-emerald-600 dark:text-emerald-500'
              }`}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <span
              data-testid="timer-countdown"
              className="text-5xl sm:text-6xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-slate-100"
            >
              {formatTimerDisplay(timer.remainingSeconds)}
            </span>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 max-w-[190px] truncate">
              {selectedTask
                ? selectedTask.title
                : selectedSubject
                ? selectedSubject.name
                : timer.mode === 'focus'
                ? 'Unassigned Focus Block'
                : 'Rest & Recharge'}
            </p>
          </div>
        </div>

        {/* Completion Banner if status === 'completed' */}
        {timer.status === 'completed' && (
          <div className="mb-6 w-full max-w-md rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {timer.mode === 'focus'
                  ? 'Focus session recorded!'
                  : 'Break completed!'}
              </span>
            </div>
            <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
              {timer.mode === 'focus'
                ? isLongBreakRecommended
                  ? 'You have completed 4 focus sessions! Take a 15-minute long break.'
                  : 'Great focus block. Ready for a short break or another session?'
                : 'Switch back to Focus mode when you are ready to continue.'}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              {timer.mode === 'focus' ? (
                <button
                  type="button"
                  onClick={() =>
                    timer.switchMode(isLongBreakRecommended ? 'long_break' : 'short_break')
                  }
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  Start {isLongBreakRecommended ? 'Long Break' : 'Short Break'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => timer.switchMode('focus')}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Back to Focus Mode
                </button>
              )}
            </div>
          </div>
        )}

        {/* Primary Timer Controls */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {timer.status === 'idle' || timer.status === 'completed' ? (
            <button
              type="button"
              onClick={timer.startTimer}
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>
                {timer.status === 'completed' ? 'Start Again' : `Start ${MODE_LABELS[timer.mode]}`}
              </span>
            </button>
          ) : timer.status === 'running' ? (
            <button
              type="button"
              onClick={timer.pauseTimer}
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Pause className="h-4 w-4 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={timer.resumeTimer}
              className="inline-flex items-center gap-2 px-7 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>Resume</span>
            </button>
          )}

          <button
            type="button"
            onClick={timer.resetTimer}
            disabled={timer.status === 'idle'}
            className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>

          {timer.mode !== 'focus' && (
            <button
              type="button"
              onClick={timer.skipBreak}
              className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors whitespace-nowrap shrink-0"
            >
              <SkipForward className="h-4 w-4" />
              <span>Skip Break</span>
            </button>
          )}
        </div>

        {/* Task & Subject Association Selectors */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="timer-subject-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Associated Subject
            </label>
            <select
              id="timer-subject-select"
              value={timer.selectedSubjectId || ''}
              onChange={(e) => timer.setSelectedSubjectId(e.target.value || null)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">No specific subject</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="timer-task-select"
              className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Associated Task
            </label>
            <select
              id="timer-task-select"
              value={timer.selectedTaskId || ''}
              onChange={(e) => timer.setSelectedTaskId(e.target.value || null)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">No specific task</option>
              {pendingTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
