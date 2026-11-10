import {
  Achievement,
  DailyGoal,
  FocusSession,
  Profile,
  Subject,
  Task,
  UserPreferences,
} from '../types';
import { generateUUID, getUserTimezone } from '../utils/dateUtils';

const DB_NAME = 'focusflow_guest_db';
const DB_VERSION = 1;
export const GUEST_USER_ID = 'guest-local-user';

export type StoreName =
  | 'profiles'
  | 'tasks'
  | 'subjects'
  | 'focus_sessions'
  | 'daily_goals'
  | 'achievements'
  | 'user_preferences';

const ALL_STORES: StoreName[] = [
  'profiles',
  'tasks',
  'subjects',
  'focus_sessions',
  'daily_goals',
  'achievements',
  'user_preferences',
];

// Fallback in-memory store for environments where IndexedDB is unavailable (e.g., Node/Vitest)
const memoryStore: Record<StoreName, Map<string, unknown>> = {
  profiles: new Map(),
  tasks: new Map(),
  subjects: new Map(),
  focus_sessions: new Map(),
  daily_goals: new Map(),
  achievements: new Map(),
  user_preferences: new Map(),
};

function hasIndexedDB(): boolean {
  return typeof indexedDB !== 'undefined' && indexedDB !== null;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openGuestDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const storeName of ALL_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

export async function idbGetAll<T>(storeName: StoreName): Promise<T[]> {
  if (!hasIndexedDB()) {
    return Array.from(memoryStore[storeName].values()) as T[];
  }
  const db = await openGuestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result || []) as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetById<T>(storeName: StoreName, id: string): Promise<T | null> {
  if (!hasIndexedDB()) {
    return (memoryStore[storeName].get(id) as T) || null;
  }
  const db = await openGuestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as T) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut<T extends { id: string }>(storeName: StoreName, item: T): Promise<T> {
  if (!hasIndexedDB()) {
    memoryStore[storeName].set(item.id, item);
    return item;
  }
  const db = await openGuestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve(item);
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(storeName: StoreName, id: string): Promise<void> {
  if (!hasIndexedDB()) {
    memoryStore[storeName].delete(id);
    return;
  }
  const db = await openGuestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbClearStore(storeName: StoreName): Promise<void> {
  if (!hasIndexedDB()) {
    memoryStore[storeName].clear();
    return;
  }
  const db = await openGuestDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbClearAllGuestData(): Promise<void> {
  for (const store of ALL_STORES) {
    await idbClearStore(store);
  }
}

export interface GuestDataBundle {
  profile: Profile | null;
  preferences: UserPreferences | null;
  dailyGoal: DailyGoal | null;
  subjects: Subject[];
  tasks: Task[];
  sessions: FocusSession[];
  achievements: Achievement[];
}

export async function exportGuestDataBundle(): Promise<GuestDataBundle> {
  const [profiles, preferences, dailyGoals, subjects, tasks, sessions, achievements] =
    await Promise.all([
      idbGetAll<Profile>('profiles'),
      idbGetAll<UserPreferences>('user_preferences'),
      idbGetAll<DailyGoal>('daily_goals'),
      idbGetAll<Subject>('subjects'),
      idbGetAll<Task>('tasks'),
      idbGetAll<FocusSession>('focus_sessions'),
      idbGetAll<Achievement>('achievements'),
    ]);

  return {
    profile: profiles[0] || null,
    preferences: preferences[0] || null,
    dailyGoal: dailyGoals[0] || null,
    subjects,
    tasks,
    sessions,
    achievements,
  };
}

export async function ensureGuestDefaults(): Promise<{
  profile: Profile;
  preferences: UserPreferences;
  dailyGoal: DailyGoal;
}> {
  const now = new Date().toISOString();
  const profiles = await idbGetAll<Profile>('profiles');
  let profile = profiles[0];
  if (!profile) {
    profile = {
      id: GUEST_USER_ID,
      username: 'guest',
      display_name: 'Guest Scholar',
      avatar_url: null,
      timezone: getUserTimezone(),
      created_at: now,
    };
    await idbPut('profiles', profile);
  }

  const prefsList = await idbGetAll<UserPreferences>('user_preferences');
  let preferences = prefsList[0];
  if (!preferences) {
    preferences = {
      id: generateUUID(),
      user_id: GUEST_USER_ID,
      theme: 'system',
      focus_duration: 25,
      short_break_duration: 5,
      long_break_duration: 15,
      daily_goal_minutes: 120,
      updated_at: now,
    };
    await idbPut('user_preferences', preferences);
  }

  const goalsList = await idbGetAll<DailyGoal>('daily_goals');
  let dailyGoal = goalsList[0];
  if (!dailyGoal) {
    dailyGoal = {
      id: generateUUID(),
      user_id: GUEST_USER_ID,
      target_minutes: preferences.daily_goal_minutes || 120,
      target_sessions: 4,
      created_at: now,
      updated_at: now,
    };
    await idbPut('daily_goals', dailyGoal);
  }

  return { profile, preferences, dailyGoal };
}
