import React, { useMemo } from 'react';
import { Award, CheckCircle2, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  ACHIEVEMENT_DEFINITIONS,
  evaluateAchievementProgress,
} from '../utils/analyticsEngine';
import { toLocalDateKey } from '../utils/dateUtils';

export const AchievementsPage: React.FC = () => {
  const { sessions, tasks, achievements } = useApp();
  const todayKey = toLocalDateKey(new Date());

  const progressMap = useMemo(
    () => evaluateAchievementProgress(sessions, tasks, todayKey),
    [sessions, tasks, todayKey]
  );

  const unlockedLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of achievements) {
      map.set(a.achievement_key, a.unlocked_at);
    }
    return map;
  }, [achievements]);

  const unlockedCount = ACHIEVEMENT_DEFINITIONS.filter(
    (def) => progressMap[def.key]?.unlocked || unlockedLookup.has(def.key)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            Milestones & Achievements
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Unlocked automatically from your verified focus sessions and completed tasks
          </p>
        </div>

        <div className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-400">
          Unlocked: <span className="font-semibold text-slate-900 dark:text-slate-100">{unlockedCount}</span> /{' '}
          {ACHIEVEMENT_DEFINITIONS.length}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ACHIEVEMENT_DEFINITIONS.map((def) => {
          const prog = progressMap[def.key];
          const unlockedAt = unlockedLookup.get(def.key);
          const isUnlocked = Boolean(prog?.unlocked || unlockedAt);
          const pct = Math.min(
            100,
            Math.round(((prog?.currentValue || 0) / def.targetValue) * 100)
          );

          return (
            <div
              key={def.key}
              className={`rounded-xl border p-6 transition-colors ${
                isUnlocked
                  ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60'
                  : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isUnlocked
                        ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {isUnlocked ? (
                      <Award className="h-5 w-5" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {def.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      {def.description}
                    </p>
                  </div>
                </div>

                {isUnlocked && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    {isUnlocked
                      ? unlockedAt
                        ? `Unlocked ${new Date(unlockedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}`
                        : 'Unlocked'
                      : 'In progress'}
                  </span>
                  <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
                    {prog?.currentValue || 0} / {def.targetValue} {def.unitLabel} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isUnlocked
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : 'bg-blue-600 dark:bg-blue-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
