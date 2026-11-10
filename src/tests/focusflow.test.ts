import { beforeEach, describe, expect, it } from 'vitest';
import { idbClearAllGuestData, GUEST_USER_ID } from '../database/indexedDb';
import { storageService } from '../services/storageService';
import {
  calculateStreakSummary,
  calculateSubjectStats,
  computeAnalyticsSummary,
  evaluateAchievementProgress,
  generateSmartInsights,
  getValidCompletedFocusSessions,
} from '../utils/analyticsEngine';
import {
  addDaysToKey,
  diffCalendarDays,
  formatDurationHuman,
  formatTimerDisplay,
  isTaskOverdue,
} from '../utils/dateUtils';
import { FocusSession } from '../types';

describe('FocusFlow Quality Assurance Suite', () => {
  beforeEach(async () => {
    await idbClearAllGuestData();
  });

  describe('1. Timer & Session Integrity Tests', () => {
    it('formats countdown and human durations accurately', () => {
      expect(formatTimerDisplay(1500)).toBe('25:00');
      expect(formatTimerDisplay(65)).toBe('01:05');
      expect(formatTimerDisplay(0)).toBe('00:00');
      expect(formatDurationHuman(5400)).toBe('1h 30m');
      expect(formatDurationHuman(1500)).toBe('25m');
      expect(formatDurationHuman(0)).toBe('0m');
    });

    it('prevents duplicate focus session records and excludes break or abandoned sessions', async () => {
      // Save a completed focus session twice with the same sessionId
      const sessionId = 'session-unique-101';
      await storageService.recordCompletedFocusSession(null, {
        id: sessionId,
        subject_id: null,
        task_id: null,
        started_at: '2026-11-09T10:00:00.000Z',
        completed_at: '2026-11-09T10:25:00.000Z',
        duration_seconds: 1500,
        session_type: 'focus',
      });

      await storageService.recordCompletedFocusSession(null, {
        id: sessionId,
        subject_id: null,
        task_id: null,
        started_at: '2026-11-09T10:00:00.000Z',
        completed_at: '2026-11-09T10:25:00.000Z',
        duration_seconds: 1500,
        session_type: 'focus',
      });

      // Attempt to record a short break or long break
      const breakRes = await storageService.recordCompletedFocusSession(null, {
        id: 'break-session-202',
        subject_id: null,
        task_id: null,
        started_at: '2026-11-09T10:25:00.000Z',
        completed_at: '2026-11-09T10:30:00.000Z',
        duration_seconds: 300,
        session_type: 'short_break',
      });

      expect(breakRes).toBeNull();

      const snapshot = await storageService.loadWorkspace(null);
      expect(snapshot.sessions).toHaveLength(1);
      expect(snapshot.sessions[0].id).toBe(sessionId);
      expect(snapshot.sessions[0].duration_seconds).toBe(1500);
    });

    it('filters out break and abandoned sessions in getValidCompletedFocusSessions', () => {
      const mixed: FocusSession[] = [
        {
          id: 's1',
          user_id: GUEST_USER_ID,
          subject_id: null,
          task_id: null,
          started_at: '2026-11-09T09:00:00Z',
          completed_at: '2026-11-09T09:25:00Z',
          duration_seconds: 1500,
          session_type: 'focus',
          status: 'completed',
          created_at: '2026-11-09T09:25:00Z',
        },
        {
          id: 's1', // duplicate ID
          user_id: GUEST_USER_ID,
          subject_id: null,
          task_id: null,
          started_at: '2026-11-09T09:00:00Z',
          completed_at: '2026-11-09T09:25:00Z',
          duration_seconds: 1500,
          session_type: 'focus',
          status: 'completed',
          created_at: '2026-11-09T09:25:00Z',
        },
        {
          id: 's2',
          user_id: GUEST_USER_ID,
          subject_id: null,
          task_id: null,
          started_at: '2026-11-09T09:25:00Z',
          completed_at: '2026-11-09T09:30:00Z',
          duration_seconds: 300,
          session_type: 'short_break',
          status: 'completed',
          created_at: '2026-11-09T09:30:00Z',
        },
        {
          id: 's3',
          user_id: GUEST_USER_ID,
          subject_id: null,
          task_id: null,
          started_at: '2026-11-09T10:00:00Z',
          completed_at: '2026-11-09T10:10:00Z',
          duration_seconds: 600,
          session_type: 'focus',
          status: 'abandoned',
          created_at: '2026-11-09T10:10:00Z',
        },
      ];

      const valid = getValidCompletedFocusSessions(mixed);
      expect(valid).toHaveLength(1);
      expect(valid[0].id).toBe('s1');
    });
  });

  describe('2. Task Management & Subject Tracker CRUD Tests', () => {
    it('creates, edits, completes, reopens, and deletes tasks with persistence', async () => {
      const subject = await storageService.createSubject(null, {
        name: 'Data Structures',
        description: 'Trees and graphs',
      });

      const task = await storageService.createTask(null, {
        title: 'Implement Red-Black Tree',
        description: 'Insertion and rotation cases',
        priority: 'high',
        subject_id: subject.id,
        due_date: '2026-11-15',
      });

      expect(task.status).toBe('pending');
      expect(task.completed_at).toBeNull();

      // Complete task
      const completed = await storageService.updateTask(null, task.id, { status: 'completed' });
      expect(completed.status).toBe('completed');
      expect(completed.completed_at).not.toBeNull();

      // Reopen task
      const reopened = await storageService.updateTask(null, task.id, { status: 'pending' });
      expect(reopened.status).toBe('pending');
      expect(reopened.completed_at).toBeNull();

      // Delete task
      await storageService.deleteTask(null, task.id);
      const workspace = await storageService.loadWorkspace(null);
      expect(workspace.tasks).toHaveLength(0);
    });

    it('calculates subject statistics accurately from completed focus sessions and tasks', async () => {
      const math = await storageService.createSubject(null, {
        name: 'Mathematics',
        description: 'Linear Algebra',
      });

      const t1 = await storageService.createTask(null, {
        title: 'Eigenvalues problem set',
        priority: 'medium',
        subject_id: math.id,
        due_date: '2026-11-10',
      });
      await storageService.updateTask(null, t1.id, { status: 'completed' });

      await storageService.recordCompletedFocusSession(null, {
        id: 'math-sess-1',
        subject_id: math.id,
        task_id: t1.id,
        started_at: '2026-11-09T12:00:00.000Z',
        completed_at: '2026-11-09T12:25:00.000Z',
        duration_seconds: 1500,
        session_type: 'focus',
      });

      const ws = await storageService.loadWorkspace(null);
      const stats = calculateSubjectStats(ws.subjects, ws.sessions, ws.tasks);
      expect(stats).toHaveLength(1);
      expect(stats[0].totalFocusSeconds).toBe(1500);
      expect(stats[0].completedFocusSessions).toBe(1);
      expect(stats[0].completedTasks).toBe(1);
    });

    it('detects overdue tasks accurately', () => {
      expect(isTaskOverdue('2026-11-01', 'pending', '2026-11-09')).toBe(true);
      expect(isTaskOverdue('2026-11-01', 'completed', '2026-11-09')).toBe(false);
      expect(isTaskOverdue('2026-11-09', 'pending', '2026-11-09')).toBe(false);
    });
  });

  describe('3. Streaks, Achievements & Analytics Engine Tests', () => {
    it('calculates current streak, longest streak, and active days accurately', () => {
      const todayKey = '2026-11-09';
      const yesterdayKey = addDaysToKey(todayKey, -1);
      const twoDaysAgoKey = addDaysToKey(todayKey, -2);
      const tenDaysAgoKey = addDaysToKey(todayKey, -10);

      expect(diffCalendarDays(todayKey, yesterdayKey)).toBe(1);

      const sessions: FocusSession[] = [
        {
          id: 'd1',
          user_id: GUEST_USER_ID,
          subject_id: null,
          task_id: null,
          started_at: `${todayKey}T10:00:00`,
          completed_at: `${todayKey}T10:25:00`,
          duration_seconds: 1500,
          session_type: 'focus',
          status: 'completed',
          created_at: `${todayKey}T10:25:00`,
        },
        {
          id: 'd2',
          user_id: GUEST_USER_ID,
          subject_id: null,
          task_id: null,
          started_at: `${yesterdayKey}T10:00:00`,
          completed_at: `${yesterdayKey}T10:25:00`,
          duration_seconds: 1500,
          session_type: 'focus',
          status: 'completed',
          created_at: `${yesterdayKey}T10:25:00`,
        },
        {
          id: 'd3',
          user_id: GUEST_USER_ID,
          subject_id: null,
          task_id: null,
          started_at: `${twoDaysAgoKey}T10:00:00`,
          completed_at: `${twoDaysAgoKey}T10:25:00`,
          duration_seconds: 1500,
          session_type: 'focus',
          status: 'completed',
          created_at: `${twoDaysAgoKey}T10:25:00`,
        },
        {
          id: 'd4',
          user_id: GUEST_USER_ID,
          subject_id: null,
          task_id: null,
          started_at: `${tenDaysAgoKey}T10:00:00`,
          completed_at: `${tenDaysAgoKey}T10:25:00`,
          duration_seconds: 1500,
          session_type: 'focus',
          status: 'completed',
          created_at: `${tenDaysAgoKey}T10:25:00`,
        },
      ];

      const streak = calculateStreakSummary(sessions, todayKey);
      expect(streak.currentStreak).toBe(3);
      expect(streak.longestStreak).toBe(3);
      expect(streak.totalActiveDays).toBe(4);
      expect(streak.activeToday).toBe(true);
    });

    it('unlocks achievements based on real records and prevents duplicate unlocks', async () => {
      const sessions: FocusSession[] = Array.from({ length: 5 }, (_, idx) => ({
        id: `sess-${idx}`,
        user_id: GUEST_USER_ID,
        subject_id: null,
        task_id: null,
        started_at: '2026-11-09T10:00:00Z',
        completed_at: '2026-11-09T10:25:00Z',
        duration_seconds: 1500,
        session_type: 'focus',
        status: 'completed',
        created_at: '2026-11-09T10:25:00Z',
      }));

      const progress = evaluateAchievementProgress(sessions, [], '2026-11-09');
      expect(progress.first_focus.unlocked).toBe(true);
      expect(progress.getting_started.unlocked).toBe(true);
      expect(progress.focus_champion.unlocked).toBe(false);

      const firstUnlock = await storageService.unlockAchievements(null, [], [
        'first_focus',
        'getting_started',
      ]);
      expect(firstUnlock).toHaveLength(2);

      // Re-unlocking already unlocked keys must return 0 new records
      const duplicateAttempt = await storageService.unlockAchievements(null, firstUnlock, [
        'first_focus',
        'getting_started',
      ]);
      expect(duplicateAttempt).toHaveLength(0);
    });

    it('handles empty datasets in analytics and insights without fabricating statistics', () => {
      const emptyAnalytics = computeAnalyticsSummary([], [], [], 7, '2026-11-09');
      expect(emptyAnalytics.totalFocusSeconds).toBe(0);
      expect(emptyAnalytics.completedSessionsCount).toBe(0);
      expect(emptyAnalytics.averageSessionMinutes).toBe(0);
      expect(emptyAnalytics.subjectDistribution).toHaveLength(0);

      const emptyInsights = generateSmartInsights([], [], 120, '2026-11-09');
      expect(emptyInsights).toHaveLength(6);
      expect(emptyInsights.every((i) => i.hasSufficientData === false)).toBe(true);
    });
  });
});
