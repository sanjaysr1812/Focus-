import { supabase } from '../database/supabaseClient';
import {
  ensureGuestDefaults,
  exportGuestDataBundle,
  GUEST_USER_ID,
  idbClearAllGuestData,
  idbDelete,
  idbGetAll,
  idbGetById,
  idbPut,
} from '../database/indexedDb';
import {
  Achievement,
  AchievementKey,
  DailyGoal,
  FocusSession,
  PriorityLevel,
  Profile,
  SessionMode,
  Subject,
  Task,
  TaskStatus,
  UserPreferences,
} from '../types';
import { generateUUID, getUserTimezone } from '../utils/dateUtils';

export interface WorkspaceSnapshot {
  profile: Profile;
  preferences: UserPreferences;
  dailyGoal: DailyGoal;
  subjects: Subject[];
  tasks: Task[];
  sessions: FocusSession[];
  achievements: Achievement[];
}

export interface MigrationReport {
  migratedSubjects: number;
  migratedTasks: number;
  migratedSessions: number;
  migratedAchievements: number;
  success: boolean;
  error?: string;
}

/**
 * Unified Data-Access Service.
 * Transparently separates UI components from underlying storage (IndexedDB for Guest Mode,
 * Supabase PostgreSQL with RLS for Authenticated accounts).
 */
export const storageService = {
  async loadWorkspace(userId: string | null): Promise<WorkspaceSnapshot> {
    if (!userId || userId === GUEST_USER_ID || !supabase) {
      const defaults = await ensureGuestDefaults();
      const [subjects, tasks, sessions, achievements] = await Promise.all([
        idbGetAll<Subject>('subjects'),
        idbGetAll<Task>('tasks'),
        idbGetAll<FocusSession>('focus_sessions'),
        idbGetAll<Achievement>('achievements'),
      ]);

      return {
        profile: defaults.profile,
        preferences: defaults.preferences,
        dailyGoal: defaults.dailyGoal,
        subjects: subjects.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),
        tasks: tasks.sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
        sessions: sessions.sort(
          (a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
        ),
        achievements,
      };
    }

    // Authenticated Supabase mode
    const now = new Date().toISOString();
    const [
      profileRes,
      prefsRes,
      goalRes,
      subjectsRes,
      tasksRes,
      sessionsRes,
      achievementsRes,
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('user_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('daily_goals').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('subjects').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('focus_sessions').select('*').eq('user_id', userId).order('completed_at', { ascending: false }),
      supabase.from('achievements').select('*').eq('user_id', userId),
    ]);

    let profile: Profile = profileRes.data;
    if (!profile) {
      const { data: userAuth } = await supabase.auth.getUser();
      const emailPrefix = userAuth.user?.email?.split('@')[0] || 'scholar';
      const newProfile: Profile = {
        id: userId,
        username: emailPrefix,
        display_name: userAuth.user?.user_metadata?.display_name || emailPrefix,
        avatar_url: null,
        timezone: getUserTimezone(),
        created_at: now,
      };
      const { data: insertedProfile } = await supabase
        .from('profiles')
        .upsert(newProfile)
        .select()
        .single();
      profile = insertedProfile || newProfile;
    }

    let preferences: UserPreferences = prefsRes.data;
    if (!preferences) {
      const newPrefs: UserPreferences = {
        id: generateUUID(),
        user_id: userId,
        theme: 'system',
        focus_duration: 25,
        short_break_duration: 5,
        long_break_duration: 15,
        daily_goal_minutes: 120,
        updated_at: now,
      };
      const { data: insertedPrefs } = await supabase
        .from('user_preferences')
        .upsert(newPrefs, { onConflict: 'user_id' })
        .select()
        .single();
      preferences = insertedPrefs || newPrefs;
    }

    let dailyGoal: DailyGoal = goalRes.data;
    if (!dailyGoal) {
      const newGoal: DailyGoal = {
        id: generateUUID(),
        user_id: userId,
        target_minutes: preferences.daily_goal_minutes || 120,
        target_sessions: 4,
        created_at: now,
        updated_at: now,
      };
      const { data: insertedGoal } = await supabase
        .from('daily_goals')
        .upsert(newGoal, { onConflict: 'user_id' })
        .select()
        .single();
      dailyGoal = insertedGoal || newGoal;
    }

    return {
      profile,
      preferences,
      dailyGoal,
      subjects: (subjectsRes.data || []) as Subject[],
      tasks: (tasksRes.data || []) as Task[],
      sessions: (sessionsRes.data || []) as FocusSession[],
      achievements: (achievementsRes.data || []) as Achievement[],
    };
  },

  // PROFILE & PREFERENCES
  async updateProfile(
    userId: string | null,
    updates: Partial<Pick<Profile, 'username' | 'display_name' | 'timezone' | 'avatar_url'>>
  ): Promise<Profile> {
    if (!userId || userId === GUEST_USER_ID || !supabase) {
      const { profile } = await ensureGuestDefaults();
      const updated: Profile = { ...profile, ...updates };
      await idbPut('profiles', updated);
      return updated;
    }
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Profile;
  },

  async updatePreferences(
    userId: string | null,
    currentPrefs: UserPreferences,
    updates: Partial<
      Pick<
        UserPreferences,
        'theme' | 'focus_duration' | 'short_break_duration' | 'long_break_duration' | 'daily_goal_minutes'
      >
    >
  ): Promise<UserPreferences> {
    const now = new Date().toISOString();
    const updated: UserPreferences = {
      ...currentPrefs,
      ...updates,
      updated_at: now,
    };

    if (!userId || userId === GUEST_USER_ID || !supabase) {
      await idbPut('user_preferences', updated);
      return updated;
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({ ...updated, user_id: userId }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as UserPreferences;
  },

  async updateDailyGoal(
    userId: string | null,
    currentGoal: DailyGoal,
    updates: Partial<Pick<DailyGoal, 'target_minutes' | 'target_sessions'>>
  ): Promise<DailyGoal> {
    const now = new Date().toISOString();
    const updated: DailyGoal = {
      ...currentGoal,
      ...updates,
      updated_at: now,
    };

    if (!userId || userId === GUEST_USER_ID || !supabase) {
      await idbPut('daily_goals', updated);
      return updated;
    }

    const { data, error } = await supabase
      .from('daily_goals')
      .upsert({ ...updated, user_id: userId }, { onConflict: 'user_id' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as DailyGoal;
  },

  // SUBJECTS CRUD
  async createSubject(
    userId: string | null,
    input: { name: string; description: string; icon?: string; color?: string }
  ): Promise<Subject> {
    const cleanName = input.name.trim();
    if (!cleanName) throw new Error('Subject name is required.');

    const now = new Date().toISOString();
    const effectiveUserId = !userId || !supabase ? GUEST_USER_ID : userId;
    const subject: Subject = {
      id: generateUUID(),
      user_id: effectiveUserId,
      name: cleanName,
      description: input.description.trim(),
      icon: input.icon || 'BookOpen',
      color: input.color || 'blue',
      created_at: now,
    };

    if (effectiveUserId === GUEST_USER_ID || !supabase) {
      await idbPut('subjects', subject);
      return subject;
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        id: subject.id,
        user_id: effectiveUserId,
        name: subject.name,
        description: subject.description,
        created_at: subject.created_at,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ...subject, ...data };
  },

  async updateSubject(
    userId: string | null,
    subjectId: string,
    updates: { name: string; description: string; icon?: string; color?: string }
  ): Promise<Subject> {
    const cleanName = updates.name.trim();
    if (!cleanName) throw new Error('Subject name is required.');

    if (!userId || userId === GUEST_USER_ID || !supabase) {
      const existing = await idbGetById<Subject>('subjects', subjectId);
      if (!existing) throw new Error('Subject not found.');
      const updated: Subject = {
        ...existing,
        name: cleanName,
        description: updates.description.trim(),
        icon: updates.icon ?? existing.icon,
        color: updates.color ?? existing.color,
      };
      await idbPut('subjects', updated);
      return updated;
    }

    const { data, error } = await supabase
      .from('subjects')
      .update({
        name: cleanName,
        description: updates.description.trim(),
      })
      .eq('id', subjectId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { ...(data as Subject), icon: updates.icon, color: updates.color };
  },

  async deleteSubject(userId: string | null, subjectId: string): Promise<void> {
    if (!userId || userId === GUEST_USER_ID || !supabase) {
      await idbDelete('subjects', subjectId);
      // Unlink tasks and sessions referencing this subject in Guest DB
      const tasks = await idbGetAll<Task>('tasks');
      for (const t of tasks) {
        if (t.subject_id === subjectId) {
          await idbPut('tasks', { ...t, subject_id: null, updated_at: new Date().toISOString() });
        }
      }
      const sessions = await idbGetAll<FocusSession>('focus_sessions');
      for (const s of sessions) {
        if (s.subject_id === subjectId) {
          await idbPut('focus_sessions', { ...s, subject_id: null });
        }
      }
      return;
    }

    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subjectId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  // TASKS CRUD
  async createTask(
    userId: string | null,
    input: {
      title: string;
      description?: string;
      priority: PriorityLevel;
      subject_id: string | null;
      due_date: string | null;
    }
  ): Promise<Task> {
    const cleanTitle = input.title.trim();
    if (!cleanTitle) throw new Error('Task title is required.');

    const now = new Date().toISOString();
    const effectiveUserId = !userId || !supabase ? GUEST_USER_ID : userId;
    const task: Task = {
      id: generateUUID(),
      user_id: effectiveUserId,
      title: cleanTitle,
      description: (input.description || '').trim(),
      priority: input.priority || 'medium',
      status: 'pending',
      subject_id: input.subject_id || null,
      due_date: input.due_date || null,
      created_at: now,
      completed_at: null,
      updated_at: now,
    };

    if (effectiveUserId === GUEST_USER_ID || !supabase) {
      await idbPut('tasks', task);
      return task;
    }

    const { data, error } = await supabase.from('tasks').insert(task).select().single();
    if (error) throw new Error(error.message);
    return data as Task;
  },

  async updateTask(
    userId: string | null,
    taskId: string,
    updates: Partial<
      Pick<Task, 'title' | 'description' | 'priority' | 'status' | 'subject_id' | 'due_date'>
    >
  ): Promise<Task> {
    if (updates.title !== undefined && !updates.title.trim()) {
      throw new Error('Task title cannot be empty.');
    }

    const now = new Date().toISOString();

    if (!userId || userId === GUEST_USER_ID || !supabase) {
      const existing = await idbGetById<Task>('tasks', taskId);
      if (!existing) throw new Error('Task not found.');
      const nextStatus: TaskStatus = updates.status ?? existing.status;
      const completedAt =
        nextStatus === 'completed'
          ? existing.status === 'completed'
            ? existing.completed_at || now
            : now
          : null;

      const updated: Task = {
        ...existing,
        ...updates,
        title: updates.title !== undefined ? updates.title.trim() : existing.title,
        description:
          updates.description !== undefined ? updates.description.trim() : existing.description,
        status: nextStatus,
        completed_at: completedAt,
        updated_at: now,
      };
      await idbPut('tasks', updated);
      return updated;
    }

    const payload: Record<string, unknown> = {
      ...updates,
      updated_at: now,
    };
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.status === 'completed') {
      payload.completed_at = now;
    } else if (updates.status === 'pending') {
      payload.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as Task;
  },

  async deleteTask(userId: string | null, taskId: string): Promise<void> {
    if (!userId || userId === GUEST_USER_ID || !supabase) {
      await idbDelete('tasks', taskId);
      const sessions = await idbGetAll<FocusSession>('focus_sessions');
      for (const s of sessions) {
        if (s.task_id === taskId) {
          await idbPut('focus_sessions', { ...s, task_id: null });
        }
      }
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
  },

  // FOCUS SESSIONS (Idempotent by session ID to strictly prevent duplicate records)
  async recordCompletedFocusSession(
    userId: string | null,
    input: {
      id: string;
      subject_id: string | null;
      task_id: string | null;
      started_at: string;
      completed_at: string;
      duration_seconds: number;
      session_type: SessionMode;
    }
  ): Promise<FocusSession | null> {
    // Exclude break sessions from stored study statistics or store only completed focus sessions
    if (input.session_type !== 'focus') {
      return null;
    }
    if (input.duration_seconds <= 0) {
      return null;
    }

    const effectiveUserId = !userId || !supabase ? GUEST_USER_ID : userId;
    const sessionRecord: FocusSession = {
      id: input.id,
      user_id: effectiveUserId,
      subject_id: input.subject_id || null,
      task_id: input.task_id || null,
      started_at: input.started_at,
      completed_at: input.completed_at,
      duration_seconds: Math.round(input.duration_seconds),
      session_type: 'focus',
      status: 'completed',
      created_at: input.completed_at,
    };

    if (effectiveUserId === GUEST_USER_ID || !supabase) {
      const existing = await idbGetById<FocusSession>('focus_sessions', input.id);
      if (existing) {
        return existing;
      }
      await idbPut('focus_sessions', sessionRecord);
      return sessionRecord;
    }

    const { data, error } = await supabase
      .from('focus_sessions')
      .upsert(sessionRecord, { onConflict: 'id', ignoreDuplicates: true })
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as FocusSession) || sessionRecord;
  },

  // ACHIEVEMENTS (Idempotent unlocking per achievement_key)
  async unlockAchievements(
    userId: string | null,
    existingAchievements: Achievement[],
    keysToUnlock: AchievementKey[]
  ): Promise<Achievement[]> {
    const existingKeys = new Set(existingAchievements.map((a) => a.achievement_key));
    const newlyUnlocked: Achievement[] = [];
    const now = new Date().toISOString();
    const effectiveUserId = !userId || !supabase ? GUEST_USER_ID : userId;

    for (const key of keysToUnlock) {
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      const item: Achievement = {
        id: generateUUID(),
        user_id: effectiveUserId,
        achievement_key: key,
        unlocked_at: now,
      };
      newlyUnlocked.push(item);
    }

    if (newlyUnlocked.length === 0) return [];

    if (effectiveUserId === GUEST_USER_ID || !supabase) {
      for (const item of newlyUnlocked) {
        await idbPut('achievements', item);
      }
      return newlyUnlocked;
    }

    const { data, error } = await supabase
      .from('achievements')
      .upsert(newlyUnlocked, { onConflict: 'user_id,achievement_key', ignoreDuplicates: true })
      .select();

    if (error) throw new Error(error.message);
    return (data as Achievement[]) || newlyUnlocked;
  },

  // GUEST DATA INSPECTION & MIGRATION TO AUTHENTICATED ACCOUNT
  async getPendingGuestDataSummary(): Promise<{
    hasGuestData: boolean;
    subjectsCount: number;
    tasksCount: number;
    sessionsCount: number;
  }> {
    const bundle = await exportGuestDataBundle();
    const subjectsCount = bundle.subjects.length;
    const tasksCount = bundle.tasks.length;
    const sessionsCount = bundle.sessions.length;
    return {
      hasGuestData: subjectsCount > 0 || tasksCount > 0 || sessionsCount > 0,
      subjectsCount,
      tasksCount,
      sessionsCount,
    };
  },

  /**
   * Migrates Guest IndexedDB records into the authenticated user's Supabase PostgreSQL tables.
   * - Associates all records with the authenticated `targetUserId`
   * - Prevents duplicates via UUID conflict handling
   * - Preserves guest data untouched if any step fails (never silently discards guest data)
   */
  async migrateGuestDataToAccount(targetUserId: string): Promise<MigrationReport> {
    if (!supabase || !targetUserId || targetUserId === GUEST_USER_ID) {
      return {
        migratedSubjects: 0,
        migratedTasks: 0,
        migratedSessions: 0,
        migratedAchievements: 0,
        success: false,
        error: 'An active authenticated Supabase session is required to migrate guest records.',
      };
    }

    try {
      const bundle = await exportGuestDataBundle();

      let migratedSubjects = 0;
      let migratedTasks = 0;
      let migratedSessions = 0;
      let migratedAchievements = 0;

      // 1. Migrate Subjects first (since tasks and focus_sessions reference subject_id)
      if (bundle.subjects.length > 0) {
        const subjectsPayload = bundle.subjects.map((s) => ({
          id: s.id,
          user_id: targetUserId,
          name: s.name,
          description: s.description,
          created_at: s.created_at,
        }));
        const { error: subError } = await supabase
          .from('subjects')
          .upsert(subjectsPayload, { onConflict: 'id' });
        if (subError) throw new Error(`Failed migrating subjects: ${subError.message}`);
        migratedSubjects = subjectsPayload.length;
      }

      // 2. Migrate Tasks (since focus_sessions can reference task_id)
      if (bundle.tasks.length > 0) {
        const tasksPayload = bundle.tasks.map((t) => ({
          id: t.id,
          user_id: targetUserId,
          title: t.title,
          description: t.description,
          priority: t.priority,
          status: t.status,
          subject_id: t.subject_id,
          due_date: t.due_date,
          created_at: t.created_at,
          completed_at: t.completed_at,
          updated_at: t.updated_at,
        }));
        const { error: taskError } = await supabase
          .from('tasks')
          .upsert(tasksPayload, { onConflict: 'id' });
        if (taskError) throw new Error(`Failed migrating tasks: ${taskError.message}`);
        migratedTasks = tasksPayload.length;
      }

      // 3. Migrate Focus Sessions
      if (bundle.sessions.length > 0) {
        const sessionsPayload = bundle.sessions.map((s) => ({
          id: s.id,
          user_id: targetUserId,
          subject_id: s.subject_id,
          task_id: s.task_id,
          started_at: s.started_at,
          completed_at: s.completed_at,
          duration_seconds: s.duration_seconds,
          session_type: s.session_type,
          status: s.status,
          created_at: s.created_at,
        }));
        const { error: sessError } = await supabase
          .from('focus_sessions')
          .upsert(sessionsPayload, { onConflict: 'id' });
        if (sessError) throw new Error(`Failed migrating focus sessions: ${sessError.message}`);
        migratedSessions = sessionsPayload.length;
      }

      // 4. Migrate Achievements
      if (bundle.achievements.length > 0) {
        const achievementsPayload = bundle.achievements.map((a) => ({
          id: a.id,
          user_id: targetUserId,
          achievement_key: a.achievement_key,
          unlocked_at: a.unlocked_at,
        }));
        const { error: achError } = await supabase
          .from('achievements')
          .upsert(achievementsPayload, { onConflict: 'user_id,achievement_key', ignoreDuplicates: true });
        if (achError) throw new Error(`Failed migrating achievements: ${achError.message}`);
        migratedAchievements = achievementsPayload.length;
      }

      // Clear Guest IndexedDB only AFTER all migrations succeed without error
      await idbClearAllGuestData();

      return {
        migratedSubjects,
        migratedTasks,
        migratedSessions,
        migratedAchievements,
        success: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected migration error';
      return {
        migratedSubjects: 0,
        migratedTasks: 0,
        migratedSessions: 0,
        migratedAchievements: 0,
        success: false,
        error: message,
      };
    }
  },
};
