import React, { useState } from 'react';
import { Bell, CheckCircle2, Monitor, Moon, Sun } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { ThemeMode } from '../types';

export const SettingsPage: React.FC = () => {
  const {
    preferences,
    dailyGoal,
    setThemeMode,
    updateTimerAndGoalPreferences,
    timer,
  } = useApp();
  const { isAuthenticated, isSupabaseReady } = useAuth();

  const [focusDuration, setFocusDuration] = useState(preferences.focus_duration);
  const [shortBreak, setShortBreak] = useState(preferences.short_break_duration);
  const [longBreak, setLongBreak] = useState(preferences.long_break_duration);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(
    dailyGoal.target_minutes || preferences.daily_goal_minutes
  );
  const [targetSessions, setTargetSessions] = useState(dailyGoal.target_sessions || 4);

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await updateTimerAndGoalPreferences({
        focus_duration: focusDuration,
        short_break_duration: shortBreak,
        long_break_duration: longBreak,
        daily_goal_minutes: dailyGoalMinutes,
        target_sessions: targetSessions,
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
          Workspace Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Configure appearance, timer intervals, and daily study goals
        </p>
      </div>

      {/* Theme Appearance Selector */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Appearance & Theme
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select Light, Dark, or follow your operating system preference
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              { id: 'light', label: 'Light Mode', icon: Sun },
              { id: 'dark', label: 'Dark Mode', icon: Moon },
              { id: 'system', label: 'System Default', icon: Monitor },
            ] as Array<{ id: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }> }>
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = preferences.theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setThemeMode(item.id)}
                className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border text-xs font-medium transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Timer & Daily Goal Form */}
      <form
        onSubmit={handleSaveSettings}
        className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-6"
      >
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Pomodoro Durations & Daily Study Goal
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Changes apply immediately to idle timers and daily/weekly goal calculations
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="settings-focus-duration"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Focus Session (minutes)
            </label>
            <input
              id="settings-focus-duration"
              type="number"
              min={1}
              max={180}
              required
              value={focusDuration}
              onChange={(e) => setFocusDuration(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="settings-short-break"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Short Break (minutes)
            </label>
            <input
              id="settings-short-break"
              type="number"
              min={1}
              max={60}
              required
              value={shortBreak}
              onChange={(e) => setShortBreak(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="settings-long-break"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Long Break (minutes)
            </label>
            <input
              id="settings-long-break"
              type="number"
              min={1}
              max={90}
              required
              value={longBreak}
              onChange={(e) => setLongBreak(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label
              htmlFor="settings-daily-goal-mins"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Daily Focus Goal (minutes / day)
            </label>
            <input
              id="settings-daily-goal-mins"
              type="number"
              min={10}
              max={960}
              required
              value={dailyGoalMinutes}
              onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="settings-daily-sessions"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Daily Target Sessions (sessions / day)
            </label>
            <input
              id="settings-daily-sessions"
              type="number"
              min={1}
              max={24}
              required
              value={targetSessions}
              onChange={(e) => setTargetSessions(Number(e.target.value))}
              className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Preferences saved</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Browser Notifications & Storage Engine Status */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Browser Completion Notifications
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Receive a desktop notification when a focus block or break finishes
            </p>
          </div>
          <button
            type="button"
            onClick={timer.requestNotificationAccess}
            disabled={
              timer.notificationPermission === 'unsupported' ||
              timer.notificationPermission === 'granted'
            }
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-60 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
          >
            <Bell className="h-3.5 w-3.5" />
            <span>
              {timer.notificationPermission === 'granted'
                ? 'Notifications Granted'
                : timer.notificationPermission === 'denied'
                ? 'Blocked in Browser Settings'
                : timer.notificationPermission === 'unsupported'
                ? 'Not Supported in This Context'
                : 'Request Permission'}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-medium text-slate-900 dark:text-slate-100">
            Active Data Persistence Mode:{' '}
            <span className="font-mono">
              {isAuthenticated
                ? 'Supabase PostgreSQL (Authenticated Account with RLS)'
                : 'IndexedDB Local Persistence (Guest Mode)'}
            </span>
          </p>
          <p>
            {isSupabaseReady
              ? 'Supabase environment credentials are configured and ready.'
              : 'Running in local Guest Mode via IndexedDB. Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable cloud authentication and PostgreSQL persistence.'}
          </p>
        </div>
      </section>
    </div>
  );
};
