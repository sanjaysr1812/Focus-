import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart2,
  BookOpen,
  Calendar,
  Clock,
  Flame,
  Play,
  Target,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SmartInsight } from '../types';
import { generateSmartInsights } from '../utils/analyticsEngine';
import { toLocalDateKey } from '../utils/dateUtils';

const CATEGORY_ICONS: Record<SmartInsight['category'], React.ComponentType<{ className?: string }>> = {
  peak_day: Calendar,
  top_subject: BookOpen,
  session_length: Clock,
  weekly_trend: BarChart2,
  consistency: Flame,
  goal_progress: Target,
};

export const InsightsPage: React.FC = () => {
  const { sessions, subjects, dailyGoal } = useApp();
  const todayKey = toLocalDateKey(new Date());

  const insights = useMemo(
    () =>
      generateSmartInsights(
        sessions,
        subjects,
        dailyGoal.target_minutes || 120,
        todayKey
      ),
    [sessions, subjects, dailyGoal.target_minutes, todayKey]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            Smart Insights
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Deterministic, rule-based observations calculated directly from your completed study records
          </p>
        </div>

        <Link
          to="/timer"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Log Focus Session</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map((item) => {
          const Icon = CATEGORY_ICONS[item.category] || Clock;
          return (
            <div
              key={item.id}
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </h3>
                  </div>

                  <span
                    className={`text-xs font-mono tabular-nums font-medium ${
                      item.hasSufficientData
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.metricLabel}
                  </span>
                </div>

                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                <span>Source: Verified Focus Sessions</span>
                <span>{item.hasSufficientData ? 'Active Metric' : 'Awaiting Records'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
