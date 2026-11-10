import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, LogOut, Shield, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC = () => {
  const { profile, updateProfileInfo, sessions, tasks } = useApp();
  const { user, isAuthenticated, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [username, setUsername] = useState(profile.username);
  const [timezone, setTimezone] = useState(profile.timezone);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim()) {
      setError('Display name and username are required.');
      return;
    }

    setSaving(true);
    setError(null);
    setSavedNotice(false);
    try {
      await updateProfileInfo({
        display_name: displayName.trim(),
        username: username.trim(),
        timezone: timezone.trim() || 'UTC',
      });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            Scholar Profile
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your identity, timezone settings, and account storage mode
          </p>
        </div>

        {isAuthenticated ? (
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 rounded-lg transition-colors self-start sm:self-auto"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors self-start sm:self-auto"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Sign In / Register Account</span>
          </Link>
        )}
      </div>

      {/* Account Storage Mode Card */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {isAuthenticated
                ? `Authenticated Account (${user?.email})`
                : 'Guest Mode (Local Browser IndexedDB)'}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {isAuthenticated
                ? 'Your tasks, subjects, focus sessions, and achievements are protected by Supabase Row Level Security.'
                : 'Your records are stored locally in IndexedDB on this device. When you create an account, you can migrate your guest records without losing history.'}
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          <div>{sessions.length} focus sessions</div>
          <div>{tasks.length} tasks</div>
        </div>
      </div>

      {/* Profile Edit Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      >
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Profile Details
        </h3>

        {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="profile-display-name"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Display Name *
            </label>
            <input
              id="profile-display-name"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="profile-username"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Username *
            </label>
            <input
              id="profile-username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="profile-timezone"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Local Timezone (IANA Format)
            </label>
            <input
              id="profile-timezone"
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            {savedNotice && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span>Profile updated</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};
