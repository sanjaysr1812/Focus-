import React, { useState } from 'react';
import { ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const GuestMigrationBanner: React.FC = () => {
  const { pendingGuestMigration, migrateGuestData } = useApp();
  const [migrating, setMigrating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedMsg, setCompletedMsg] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!pendingGuestMigration.hasGuestData && !completedMsg) return null;

  const handleMigrate = async () => {
    setMigrating(true);
    setErrorMsg(null);
    const report = await migrateGuestData();
    setMigrating(false);
    if (!report.success) {
      setErrorMsg(report.error || 'Migration failed. Your guest data remains safely stored locally.');
    } else {
      setCompletedMsg(
        `Migrated ${report.migratedSubjects} subjects, ${report.migratedTasks} tasks, and ${report.migratedSessions} focus sessions to your account.`
      );
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-4">
      {completedMsg ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{completedMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            Dismiss
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ArrowRightLeft className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Local Guest Records Detected
              </h4>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                We found {pendingGuestMigration.subjectsCount} subjects,{' '}
                {pendingGuestMigration.tasksCount} tasks, and{' '}
                {pendingGuestMigration.sessionsCount} focus sessions saved in Guest Mode on this
                browser. Import them into your authenticated account?
              </p>
              {errorMsg && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setDismissed(true)}
              disabled={migrating}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Keep Separate
            </button>
            <button
              type="button"
              onClick={handleMigrate}
              disabled={migrating}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {migrating ? 'Migrating Records...' : 'Import Guest Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
