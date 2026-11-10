import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Clock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computeAnalyticsSummary } from '../utils/analyticsEngine';
import { formatDurationHuman, toLocalDateKey } from '../utils/dateUtils';

const CHART_COLORS = ['#2563EB', '#059669', '#D97706', '#7C3AED', '#DC2626', '#0891B2'];

export const AnalyticsPage: React.FC = () => {
  const { sessions, tasks, subjects } = useApp();
  const [rangeDays, setRangeDays] = useState<number>(7);

  const todayKey = toLocalDateKey(new Date());
  const summary = useMemo(
    () => computeAnalyticsSummary(sessions, tasks, subjects, rangeDays, todayKey),
    [sessions, tasks, subjects, rangeDays, todayKey]
  );

  const hasFocusData = summary.completedSessionsCount > 0;

  return (
    <div className="space-y-8">
      {/* Header & Date-Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-display">
            Productivity Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Derived strictly from verified completed focus sessions (breaks excluded)
          </p>
        </div>

        <div
          className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl self-start sm:self-auto"
          role="tablist"
          aria-label="Analytics Date Range"
        >
          {[
            { days: 7, label: 'Last 7 Days' },
            { days: 14, label: 'Last 14 Days' },
            { days: 30, label: 'Last 30 Days' },
            { days: 0, label: 'All Time' },
          ].map((opt) => {
            const active = rangeDays === opt.days;
            return (
              <button
                key={opt.days}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRangeDays(opt.days)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Metrics Strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total Focus ({rangeDays === 0 ? 'All Time' : `${rangeDays}d`})
          </span>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {summary.totalFocusHours}h
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {formatDurationHuman(summary.totalFocusSeconds)}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Completed Sessions</span>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {summary.completedSessionsCount}
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Avg: {summary.averageSessionMinutes} min / session
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Today / 7d / 30d Focus
          </span>
          <p className="mt-2 text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {formatDurationHuman(summary.todayFocusSeconds)} ·{' '}
            {formatDurationHuman(summary.weeklyFocusSeconds)}
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            30-day total: {formatDurationHuman(summary.monthlyFocusSeconds)}
          </p>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Task Completion</span>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {summary.taskCompletionPercentage}%
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {summary.completedTasksCount} of {summary.totalTasksCount} tasks done
          </p>
        </div>
      </section>

      {/* Chart 1: Daily Focus Activity */}
      <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              1. Daily Focus Activity (Minutes)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Daily focused study duration over the selected range
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Unit: minutes (min)
          </span>
        </div>

        {!hasFocusData ? (
          <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <Clock className="h-7 w-7 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No completed focus sessions in this date range
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Complete a Pomodoro focus session to populate your daily study chart.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.dailyActivitySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                  unit="m"
                />
                <Tooltip
                  formatter={(value) => [`${value ?? 0} min`, 'Focus Duration']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="minutes" fill="#2563EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Two-Column Charts: Weekly Study Duration & Monthly Productivity Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 2: Weekly Study Duration */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              2. Weekly Study Duration (Last 4 Weeks)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total study minutes grouped by 7-day rolling windows
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.weeklySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" unit="m" />
                <Tooltip
                  formatter={(value) => [`${value ?? 0} min`, 'Weekly Focus']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="minutes" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Chart 3: Monthly Productivity Trend */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              3. 30-Day Productivity Trend
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Continuous 30-day study trajectory (minutes per day)
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" unit="m" />
                <Tooltip
                  formatter={(value) => [`${value ?? 0} min`, 'Focus Time']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="#2563EB"
                  fill="#2563EB"
                  fillOpacity={0.18}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Two-Column Charts: Subject Distribution & Task Completion / Most Productive Days */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 4: Subject Distribution */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
          <div className="mb-5">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              4. Subject Study Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown of focus duration across your subjects
            </p>
          </div>

          {summary.subjectDistribution.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-6">
              <BarChart3 className="h-7 w-7 text-slate-300 dark:text-slate-700 mb-2" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No subject distribution data yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Complete focus sessions associated with subjects to compare study allocation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.subjectDistribution}
                      dataKey="minutes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, percent }) =>
                        `${name} (${Math.round((percent || 0) * 100)}%)`
                      }
                    >
                      {summary.subjectDistribution.map((entry, idx) => (
                        <Cell
                          key={entry.subjectId}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [`${value ?? 0} min`, 'Study Time']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #334155',
                        backgroundColor: '#0f172a',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {summary.subjectDistribution.map((sub, idx) => (
                  <div
                    key={sub.subjectId}
                    className="py-2 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {sub.name}
                      </span>
                    </div>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                      {sub.minutes}m ({sub.percentage}%) · {sub.sessions} sessions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Chart 5: Task Completion Statistics & Most Productive Weekdays */}
        <section className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              5. Task Completion & Most Productive Days
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Completed vs pending tasks and focus distribution by day of week
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-xs text-slate-500 dark:text-slate-400">Completed Tasks</span>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {summary.completedTasksCount}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60">
              <span className="text-xs text-slate-500 dark:text-slate-400">Pending Tasks</span>
              <p className="mt-1 text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                {summary.totalTasksCount - summary.completedTasksCount}
              </p>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.weekdayProductivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.2} />
                <XAxis dataKey="weekday" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" unit="m" />
                <Tooltip
                  formatter={(value) => [`${value ?? 0} min`, 'Focus Time']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="minutes" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
};
