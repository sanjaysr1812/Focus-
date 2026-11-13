# FocusFlow — Focus on what matters

FocusFlow is a full-stack productivity and study management application built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, **React Router**, **Recharts**, **IndexedDB** (Guest Mode), and **Supabase PostgreSQL + Authentication + Row Level Security (RLS)**.

---

## 1. Architecture & Storage Modes

FocusFlow uses a clean data-access abstraction (`src/services/storageService.ts`) that supports two distinct persistence modes:

1. **Guest Mode (Zero-Config Local Persistence)**:
   - Uses **IndexedDB** (`src/database/indexedDb.ts`) for application records (`profiles`, `tasks`, `subjects`, `focus_sessions`, `daily_goals`, `achievements`, `user_preferences`) and **LocalStorage** for real-time timer state recovery and theme selection.
   - Works out-of-the-box without requiring external credentials.

2. **Authenticated Cloud Mode (Supabase PostgreSQL + Auth + RLS)**:
   - Uses **Supabase Authentication** for email registration, login, logout, password recovery, and persistent sessions.
   - Uses **Supabase PostgreSQL** with strict **Row Level Security (RLS)** on every user-owned table so users can only view and modify their own records.
   - Includes a **Guest-to-Account Migration** workflow (`storageService.migrateGuestDataToAccount`) that imports local IndexedDB guest records into the authenticated account without duplicates and never silently discards guest data if migration fails.

---

## 2. Database Schema & Supabase Configuration

### Tables
Defined in `supabase/migrations/001_initial_schema_and_rls.sql`:
- `profiles` (`id`, `username`, `display_name`, `avatar_url`, `timezone`, `created_at`)
- `subjects` (`id`, `user_id`, `name`, `description`, `created_at`)
- `tasks` (`id`, `user_id`, `title`, `description`, `priority`, `status`, `subject_id`, `due_date`, `created_at`, `completed_at`, `updated_at`)
- `focus_sessions` (`id`, `user_id`, `subject_id`, `task_id`, `started_at`, `completed_at`, `duration_seconds`, `session_type`, `status`, `created_at`)
- `daily_goals` (`id`, `user_id`, `target_minutes`, `target_sessions`, `created_at`, `updated_at`)
- `achievements` (`id`, `user_id`, `achievement_key`, `unlocked_at`)
- `user_preferences` (`id`, `user_id`, `theme`, `focus_duration`, `short_break_duration`, `long_break_duration`, `daily_goal_minutes`, `updated_at`)

### Steps to Configure Supabase
1. Create a new project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Copy the entire contents of `supabase/migrations/001_initial_schema_and_rls.sql` and click **Run**. This creates all 7 tables, foreign keys, check constraints, indexes, Row Level Security policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE` restricted to `auth.uid()`), and the automatic new-user bootstrap trigger.
4. Go to **Project Settings → API** and copy your **Project URL** and **anon / publishable public key** (never use or expose the `service_role` secret key in frontend code).
5. Copy `.env.example` to `.env` and fill in:
   ```env
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-supabase-anon-or-publishable-key"
   ```

---

## 3. Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server on port 3000
npm run dev

# 3. Run TypeScript typechecking
npm run lint

# 4. Run the automated Vitest QA test suite
npx vitest run

# 5. Build for production
npm run build
```

---

## 4. GitHub & Netlify Deployment Instructions

### GitHub Setup
1. Initialize a Git repository (if not already initialized) and verify `.env` is ignored by `.gitignore`.
2. Commit all source files, including `netlify.toml`, `public/_redirects`, and `supabase/migrations/001_initial_schema_and_rls.sql`.
3. Push the repository to GitHub.

### Netlify Deployment
1. Log in to [Netlify](https://app.netlify.com/) and select **Add new site → Import an existing project**.
2. Connect your GitHub repository.
3. Netlify will automatically detect the settings from `netlify.toml`:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **SPA Redirects**: Configured in both `netlify.toml` and `public/_redirects` (`/* /index.html 200`) so refreshing nested routes (`/timer`, `/tasks`, `/analytics`, etc.) never produces a 404.
4. Under **Site Configuration → Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Trigger a deploy.

---

## 5. Known Limitations
- **Supabase Cloud Sync**: Requires the user's own `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` environment variables and running the SQL migration in their Supabase project. Until configured, the application runs with full functionality in local Guest Mode via IndexedDB.
- **Browser Notifications**: Require explicit user permission and browser support for the Web Notifications API (some embedded iframe contexts restrict system notifications).


## Contributing
Contributions are welcome! Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

### Good first issue
- [Add edge-case tests for date utilities](../../issues/2)
