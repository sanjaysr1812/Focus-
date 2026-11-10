-- =============================================================================
-- FOCUSFLOW — SUPABASE POSTGRESQL SCHEMA & ROW LEVEL SECURITY MIGRATION
-- =============================================================================
-- Tables:
--   1. profiles
--   2. subjects
--   3. tasks
--   4. focus_sessions
--   5. daily_goals
--   6. achievements
--   7. user_preferences
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL CHECK (char_length(trim(username)) >= 1),
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) >= 1),
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- -----------------------------------------------------------------------------
-- 2. subjects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);

-- -----------------------------------------------------------------------------
-- 3. tasks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 1),
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON public.tasks(subject_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due_date ON public.tasks(user_id, status, due_date);

-- -----------------------------------------------------------------------------
-- 4. focus_sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  session_type TEXT NOT NULL CHECK (session_type IN ('focus', 'short_break', 'long_break')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'abandoned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id_completed ON public.focus_sessions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_subject_id ON public.focus_sessions(subject_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id ON public.focus_sessions(task_id);

-- -----------------------------------------------------------------------------
-- 5. daily_goals
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  target_minutes INTEGER NOT NULL DEFAULT 120 CHECK (target_minutes >= 1 AND target_minutes <= 1440),
  target_sessions INTEGER NOT NULL DEFAULT 4 CHECK (target_sessions >= 1 AND target_sessions <= 48),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_goals_user_id ON public.daily_goals(user_id);

-- -----------------------------------------------------------------------------
-- 6. achievements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL CHECK (
    achievement_key IN (
      'first_focus',
      'getting_started',
      'consistent_learner',
      'task_master',
      'focus_champion'
    )
  ),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.achievements(user_id);

-- -----------------------------------------------------------------------------
-- 7. user_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  focus_duration INTEGER NOT NULL DEFAULT 25 CHECK (focus_duration >= 1 AND focus_duration <= 180),
  short_break_duration INTEGER NOT NULL DEFAULT 5 CHECK (short_break_duration >= 1 AND short_break_duration <= 60),
  long_break_duration INTEGER NOT NULL DEFAULT 15 CHECK (long_break_duration >= 1 AND long_break_duration <= 90),
  daily_goal_minutes INTEGER NOT NULL DEFAULT 120 CHECK (daily_goal_minutes >= 1 AND daily_goal_minutes <= 1440),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON public.profiles FOR DELETE
  USING (auth.uid() = id);

-- subjects policies
CREATE POLICY "Users can view their own subjects"
  ON public.subjects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subjects"
  ON public.subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects"
  ON public.subjects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
  ON public.subjects FOR DELETE
  USING (auth.uid() = user_id);

-- tasks policies
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- focus_sessions policies
CREATE POLICY "Users can view their own focus sessions"
  ON public.focus_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus sessions"
  ON public.focus_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus sessions"
  ON public.focus_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own focus sessions"
  ON public.focus_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- daily_goals policies
CREATE POLICY "Users can view their own daily goals"
  ON public.daily_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily goals"
  ON public.daily_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily goals"
  ON public.daily_goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily goals"
  ON public.daily_goals FOR DELETE
  USING (auth.uid() = user_id);

-- achievements policies
CREATE POLICY "Users can view their own achievements"
  ON public.achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievements"
  ON public.achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON public.achievements FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own achievements"
  ON public.achievements FOR DELETE
  USING (auth.uid() = user_id);

-- user_preferences policies
CREATE POLICY "Users can view their own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- AUTOMATIC NEW-USER BOOTSTRAP TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_focusflow_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  default_name TEXT;
BEGIN
  default_name := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1),
    'Scholar'
  );

  INSERT INTO public.profiles (id, username, display_name, timezone)
  VALUES (NEW.id, split_part(NEW.email, '@', 1), default_name, 'UTC')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id, theme, focus_duration, short_break_duration, long_break_duration, daily_goal_minutes)
  VALUES (NEW.id, 'system', 25, 5, 15, 120)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.daily_goals (user_id, target_minutes, target_sessions)
  VALUES (NEW.id, 120, 4)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_focusflow ON auth.users;
CREATE TRIGGER on_auth_user_created_focusflow
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_focusflow_user();
