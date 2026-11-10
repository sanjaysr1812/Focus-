import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Database, Lock, Mail, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

type AuthTab = 'login' | 'register' | 'reset';

export const AuthPage: React.FC = () => {
  const {
    isAuthenticated,
    user,
    isSupabaseReady,
    signInWithEmail,
    signUpWithEmail,
    sendPasswordReset,
    signOut,
  } = useAuth();
  const { pendingGuestMigration, migrateGuestData } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState<AuthTab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      if (tab === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMsg(error);
        } else {
          navigate('/');
        }
      } else if (tab === 'register') {
        const { error, needsEmailConfirmation } = await signUpWithEmail(
          email,
          password,
          displayName
        );
        if (error) {
          setErrorMsg(error);
        } else if (needsEmailConfirmation) {
          setSuccessMsg(
            'Account created! Please check your email inbox to confirm your address before signing in.'
          );
        } else {
          setSuccessMsg('Account created and signed in!');
          navigate('/');
        }
      } else if (tab === 'reset') {
        const { error } = await sendPasswordReset(email);
        if (error) {
          setErrorMsg(error);
        } else {
          setSuccessMsg('Password recovery instructions have been sent to your email address.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-display">
                Signed In to FocusFlow
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>

          {pendingGuestMigration.hasGuestData && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-3">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                You have local Guest Mode data ({pendingGuestMigration.subjectsCount} subjects,{' '}
                {pendingGuestMigration.tasksCount} tasks, {pendingGuestMigration.sessionsCount}{' '}
                focus sessions). Would you like to migrate it to your account now?
              </p>
              <button
                type="button"
                onClick={migrateGuestData}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Migrate Guest Data to Account
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Dashboard</span>
            </button>
            <button
              type="button"
              onClick={signOut}
              className="px-4 py-2 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 rounded-lg hover:bg-red-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Supabase Configuration Notice when env vars are not yet populated */}
      {!isSupabaseReady && (
        <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 p-5 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-300">
            <Database className="h-4 w-4 shrink-0" />
            <span>Supabase Cloud Credentials Required for Account Sync</span>
          </div>
          <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
            FocusFlow is currently operating in <strong>Guest Mode (IndexedDB)</strong> with full
            local persistence. To enable Supabase Authentication and PostgreSQL cloud sync:
          </p>
          <ol className="list-decimal list-inside text-xs text-amber-800 dark:text-amber-400 space-y-1">
            <li>
              Run <code className="font-mono">supabase/migrations/001_initial_schema_and_rls.sql</code>{' '}
              in your Supabase SQL Editor.
            </li>
            <li>
              Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> in your environment.
            </li>
          </ol>
        </div>
      )}

      {/* Auth Card */}
      <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            {tab === 'login'
              ? 'Sign in to FocusFlow'
              : tab === 'register'
              ? 'Create your FocusFlow Account'
              : 'Reset your Password'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {tab === 'login'
              ? 'Access your cloud-synced tasks, sessions, and streaks.'
              : tab === 'register'
              ? 'Your existing Guest Mode data can be migrated immediately after signing up.'
              : 'Enter your account email to receive a password reset link.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          {(
            [
              { id: 'login', label: 'Sign In' },
              { id: 'register', label: 'Register' },
              { id: 'reset', label: 'Recovery' },
            ] as Array<{ id: AuthTab; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id);
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === item.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label
                htmlFor="auth-display-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Display Name
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-display-name"
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="auth-email"
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {tab !== 'reset' && (
            <div>
              <label
                htmlFor="auth-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            {submitting
              ? 'Processing...'
              : tab === 'login'
              ? 'Sign In'
              : tab === 'register'
              ? 'Create Account'
              : 'Send Recovery Email'}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Prefer to work offline without an account?</span>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Continue in Guest Mode
          </button>
        </div>
      </div>
    </div>
  );
};
