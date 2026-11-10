/**
 * Timezone-safe date and duration utilities for FocusFlow.
 * Ensures streaks, daily goals, and analytics align with the user's local calendar day.
 */

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Formats a Date or ISO timestamp into a local YYYY-MM-DD calendar date key.
 */
export function toLocalDateKey(dateInput: Date | string | number, timeZone?: string): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date);
      const y = parts.find((p) => p.type === 'year')?.value;
      const m = parts.find((p) => p.type === 'month')?.value;
      const d = parts.find((p) => p.type === 'day')?.value;
      if (y && m && d) return `${y}-${m}-${d}`;
    } catch {
      // Fallback to local browser methods
    }
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD local date key into a local Date at midnight (00:00:00).
 */
export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0, 0);
}

/**
 * Adds `days` to a YYYY-MM-DD date key and returns the new YYYY-MM-DD date key.
 */
export function addDaysToKey(dateKey: string, days: number): string {
  const dt = parseLocalDateKey(dateKey);
  dt.setDate(dt.getDate() + days);
  return toLocalDateKey(dt);
}

/**
 * Returns the difference in calendar days between two YYYY-MM-DD keys (a - b).
 */
export function diffCalendarDays(keyA: string, keyB: string): number {
  const [yA, mA, dA] = keyA.split('-').map(Number);
  const [yB, mB, dB] = keyB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.round((utcA - utcB) / (1000 * 60 * 60 * 24));
}

/**
 * Returns an array of YYYY-MM-DD keys for the last N days ending on `endDateKey` (inclusive),
 * ordered oldest to newest.
 */
export function getRecentDateKeys(daysCount: number, endDateKey: string = toLocalDateKey(new Date())): string[] {
  const keys: string[] = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    keys.push(addDaysToKey(endDateKey, -i));
  }
  return keys;
}

export function getTimeGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatTimerDisplay(totalSeconds: number): string {
  const clamped = Math.max(0, Math.ceil(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationHuman(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  if (safeSeconds === 0) return '0m';
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}

export function formatHoursDecimal(totalSeconds: number): string {
  const hours = Math.max(0, totalSeconds) / 3600;
  return hours.toFixed(1);
}

export function formatReadableDate(dateInput: Date | string): string {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(dateKey: string): string {
  if (!dateKey) return '';
  const dt = dateKey.includes('T') ? new Date(dateKey) : parseLocalDateKey(dateKey);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatWeekdayShort(dateKey: string): string {
  if (!dateKey) return '';
  const dt = parseLocalDateKey(dateKey);
  return dt.toLocaleDateString('en-US', { weekday: 'short' });
}

export function isTaskOverdue(dueDate: string | null, status: string, todayKey: string = toLocalDateKey(new Date())): boolean {
  if (!dueDate || status === 'completed') return false;
  const dueKey = dueDate.slice(0, 10);
  return dueKey < todayKey;
}

export function isTaskDueToday(dueDate: string | null, todayKey: string = toLocalDateKey(new Date())): boolean {
  if (!dueDate) return false;
  return dueDate.slice(0, 10) === todayKey;
}

export function isTaskUpcoming(dueDate: string | null, status: string, todayKey: string = toLocalDateKey(new Date())): boolean {
  if (!dueDate || status === 'completed') return false;
  const dueKey = dueDate.slice(0, 10);
  return dueKey > todayKey;
}
