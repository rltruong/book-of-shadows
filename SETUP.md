# Setup — Keepsake Log with Supabase sync

Everything here happens in a web browser. No installs.

You'll do five things:
1. Create a Supabase project
2. Create the database tables (copy-paste one SQL file)
3. Turn on email sign-in
4. Create the suggestion function (copy-paste one file) + add your Anthropic key
5. Put two values into `src/config.js` and deploy to GitHub Pages

---

## 1. Create the Supabase project

1. Go to **supabase.com** → Sign up (free) → **New project**.
2. Pick any name (e.g. `keepsake-log`), set a database password (save it
   somewhere, you won't need it day-to-day), choose the region closest to you.
3. Wait ~2 minutes while it provisions.

## 2. Create the tables

1. In the left sidebar: **SQL Editor** → **New query**.
2. Open `setup/schema.sql` from this project, copy ALL of it, paste, press **Run**.
3. You should see "Success. No rows returned."

## 3. Set up password sign-in

1. Left sidebar: **Authentication** → **Sign In / Providers**. Make sure
   **Email** is enabled (it is by default).
2. Create your user directly — no emails involved:
   **Authentication** → **Users** → **Add user** → **Create new user**.
   Enter your email and choose a strong password. Check **Auto Confirm User**
   so no confirmation email is needed. Click Create.
3. That email + password is what you use on the app's sign-in screen, on
   every device. To change the password later, use the ⋮ menu next to the
   user on that same page.

## 4. Create the suggestion function (for LLM Keepsake suggestions)

You'll need an Anthropic API key: create one at **console.anthropic.com** →
API Keys. (This is separate from a Claude.ai subscription; API usage is
pay-per-use and these small suggestion calls cost fractions of a cent.)

1. Left sidebar: **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Name it exactly: `suggest-keepsakes`
3. Delete the template code, open `setup/edge-function.ts` from this project,
   copy ALL of it, paste it in, and click **Deploy**.
4. Add the key as a secret: **Edge Functions** → **Secrets** (or Project
   Settings → Edge Functions → Secrets) → **Add new secret**:
   - Name: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-...` key
5. If you'd rather skip suggestions for now, skip this whole step and set
   `ENABLE_SUGGESTIONS = false` in `src/config.js`.

## 5. Connect the app and deploy

1. In Supabase: **Project Settings** (gear icon) → **API Keys**. Copy:
   - the **Project URL** (like `https://abcdefghij.supabase.co`)
   - the **publishable** key (`sb_publishable_...`; the legacy "anon public"
     key also works)
2. Open `src/config.js` in this project and paste both values in. (If your
   code is already on GitHub, you can edit the file right on the website:
   open the file → pencil icon → paste → Commit changes.)
3. Deploy to GitHub Pages the same way as before: upload these files to your
   repository (replacing the old ones). The included
   `.github/workflows/deploy.yml` rebuilds and publishes automatically.

## Session behavior

Signing in starts a rolling **72-hour** window (same as the Expense Tracker):
every time you open the app the clock resets, so the sign-in screen only
returns after roughly 72 hours of *not* opening it. Signing out ends the
window immediately. Note for iPhone home-screen use: iOS can purge a web
app's local storage after long disuse, which also clears the window — you'd
just sign in again.

## First run

Open your GitHub Pages URL. Sign in with the email + password you created in
step 3. On first sign-in the app automatically
copies the bundled starter data (your entries and mood days) into your
Supabase account. From then on, sign in with the same email anywhere —
desktop, phone, tablet — and everything stays in sync.

## Safety notes

- `src/config.js` contains the project URL and publishable key. These are
  designed to be public — they only allow what the Row Level Security
  policies permit (each user can touch only their own rows).
- Your Anthropic key is a real secret. It lives ONLY in the Edge Function's
  secrets on Supabase. Never put it in config.js or anywhere in the repo.
