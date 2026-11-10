/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { MainLayout } from './layouts/MainLayout';
import { DashboardPage } from './pages/DashboardPage';
import { TimerPage } from './pages/TimerPage';
import { TasksPage } from './pages/TasksPage';
import { SubjectsPage } from './pages/SubjectsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { StreaksPage } from './pages/StreaksPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { FocusRoomPage } from './pages/FocusRoomPage';
import { InsightsPage } from './pages/InsightsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AuthPage } from './pages/AuthPage';

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/timer" element={<TimerPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/subjects" element={<SubjectsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/streaks" element={<StreaksPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/focus-room" element={<FocusRoomPage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
