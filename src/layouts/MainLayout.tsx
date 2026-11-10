import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  BookOpen,
  CheckSquare,
  Clock,
  Flame,
  LayoutDashboard,
  Lightbulb,
  Maximize2,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { formatTimerDisplay } from '../utils/dateUtils';
import { GuestMigrationBanner } from '../components/GuestMigrationModal';

const PRIMARY_NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/timer', label: 'Focus Timer', icon: Clock },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/streaks', label: 'Streaks', icon: Flame },
];

const SECONDARY_NAV = [
  { to: '/subjects', label: 'Subject Tracker', icon: BookOpen },
  { to: '/focus-room', label: 'Focus Room', icon: Maximize2 },
  { to: '/insights', label: 'Smart Insights', icon: Lightbulb },
  { to: '/achievements', label: 'Achievements', icon: Award },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/profile', label: 'Profile', icon: User },
];

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/timer': 'Focus Timer',
  '/tasks': 'Tasks',
  '/analytics': 'Analytics',
  '/streaks': 'Streaks',
  '/subjects': 'Subject Tracker',
  '/focus-room': 'Focus Room',
  '/insights': 'Smart Insights',
  '/achievements': 'Achievements',
  '/settings': 'Settings',
  '/profile': 'Profile',
  '/auth': 'Account Authentication',
};

export const MainLayout: React.FC = () => {
  const { activeTheme, setThemeMode, timer, profile } = useApp();
  const { isAuthenticated, isGuest } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTitle = ROUTE_TITLES[location.pathname] || 'Workspace';

  const toggleQuickTheme = () => {
    setThemeMode(activeTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar (260px width) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-800">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display whitespace-nowrap shrink-0"
          >
            FocusFlow
          </Link>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {isAuthenticated ? 'Synced' : 'Guest'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          <div>
            <p className="px-3 mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              Core Workspace
            </p>
            <nav className="space-y-1" aria-label="Primary Navigation">
              {PRIMARY_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div>
            <p className="px-3 mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              Study Tools & Account
            </p>
            <nav className="space-y-1" aria-label="Secondary Navigation">
              {SECONDARY_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Account Status Card */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {profile.display_name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {isGuest ? 'Guest Mode · Local DB' : 'Cloud Account'}
              </p>
            </div>
            <Link
              to={isGuest ? '/auth' : '/profile'}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap shrink-0"
            >
              {isGuest ? 'Sign In' : 'Manage'}
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Top Bar Contract: Zone 1 Breadcrumb/Title — Zone 2 Timer Status (if active) — Zone 3 Primary Action */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-8 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline whitespace-nowrap">
                FocusFlow
              </span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                {currentTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {timer.status !== 'idle' && location.pathname !== '/timer' && (
              <button
                type="button"
                onClick={() => navigate('/timer')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 text-xs font-medium whitespace-nowrap shrink-0"
              >
                <Clock className="h-3.5 w-3.5" />
                <span className="font-mono tabular-nums">
                  {formatTimerDisplay(timer.remainingSeconds)}
                </span>
                <span>· {timer.status === 'paused' ? 'Paused' : 'Running'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={toggleQuickTheme}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${activeTheme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {activeTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => navigate('/timer')}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              Start Focus
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 px-4 sm:px-8 py-6 pb-24 lg:pb-10 max-w-7xl w-full mx-auto">
          <GuestMigrationBanner />
          <Outlet />
        </main>
      </div>

      {/* Mobile Slide-Over Menu for Secondary Routes */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation"
        >
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 z-10">
            <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800">
              <span className="text-lg font-bold font-display text-slate-900 dark:text-slate-100">
                FocusFlow
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <p className="px-3 mb-2 text-xs font-medium text-slate-400">Primary Sections</p>
                <nav className="space-y-1">
                  {PRIMARY_NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
              <div>
                <p className="px-3 mb-2 text-xs font-medium text-slate-400">More Sections</p>
                <nav className="space-y-1">
                  {SECONDARY_NAV.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                              : 'text-slate-700 dark:text-slate-300'
                          }`
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="block w-full text-center px-4 py-2.5 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 rounded-lg"
              >
                {isGuest ? 'Sign In / Create Account' : 'Account & Security'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation (5 Primary Sections, <= 15% mobile height) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 z-30"
      >
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2 rounded-lg min-w-[56px] min-h-[44px] text-[11px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="h-5 w-5 mb-0.5" />
              <span>{item.label.replace('Focus ', '')}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
