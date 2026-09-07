# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev      # Vite dev server
npm run build    # -> dist/ (what GitHub Pages publishes)
npm run preview  # serve the built dist/
```

There is no test suite, linter, or formatter configured. Pushing to `main`
triggers `.github/workflows/deploy.yml`, which builds and publishes `dist/` to
GitHub Pages — so a commit to `main` is a deploy.

## What this is

"Book of Shadows" (package name `keepsake-log`) is a single-user personal
journaling PWA-ish web app: a microblog where every entry is tagged with a
Hades/Hades II *Keepsake*, plus a Year-in-Pixels mood tracker. React 18 + Vite
+ Tailwind, no router, no server of its own — Supabase provides auth, Postgres,
and an Edge Function.

`SETUP.md` is the end-user instructions for standing up a fresh Supabase
project; read it before changing anything about auth, schema, or the Edge
Function, since those steps are copy-paste and drift silently.

## Architecture

Four files carry everything:

- `src/main.jsx` — mounts `<AuthGate><App/></AuthGate>`, imports fonts and CSS.
- `src/AuthGate.jsx` — email+password sign-in. Users are created by hand in the
  Supabase dashboard; the app never signs anyone up. Session model is a
  **rolling 72-hour window** stamped in `localStorage` under `bos_auth_last_ok`:
  inside the window the app renders synchronously (no login flash) while the
  live Supabase session is confirmed in the background; if that session is gone,
  it drops back to the gate.
- `src/db.js` — the only module that talks to Supabase. It also owns the
  snake_case (Postgres) ↔ camelCase (app) mapping via `rowToEntry`/`entryToRow`.
  Never call `supabase.from(...)` from `App.jsx`.
- `src/App.jsx` — ~2400 lines, everything else: four tabs (Fill Form, Keepsake
  Log, Mood Tracker, Mood Summary), all components, all domain data. It is
  deliberately one file; keep new UI here unless a piece is genuinely reusable.
- `src/config.js` — Supabase URL + publishable key, checked in on purpose (RLS
  is what protects the data), plus `ENABLE_SUGGESTIONS`. Secrets never go here.

Data flow: `App` loads entries and moods once on mount, holds them in state, and
every mutation writes through `db.js` then updates local state optimistically.
There is no realtime subscription and no refetch.

## Domain rules that aren't obvious

- **Keepsakes** — a fixed catalog of 58 in the `KEEPSAKES` array in `App.jsx`,
  each with an emoji fallback and one or more `characters` aliases. Art lives at
  `public/keepsakes/<slug>.png`, where the slug is derived at render time by
  `keepsakeSlug()` (lowercase, apostrophes dropped, non-alphanumerics → `-`).
  Adding a Keepsake means adding the array entry, a `TOPICS` list, and a PNG
  whose filename matches the slug; `KeepsakeIcon` silently falls back to the
  emoji if the image 404s.
- **Character search** — typing `/` in the Keepsake picker filters by alias
  prefix only. Aliases are intentionally shortened for some characters, so
  `/meg` matches Megaera but `/megaera` matches nothing. `CHARACTER_DISPLAY`
  maps aliases back to full names for display and for the LLM prompt.
- **Cycles** — two-month periods starting on odd months (Jan–Feb, Mar–Apr, …),
  computed by `getCycleKey()` from the entry's *datetime*, not its creation
  time. A Keepsake may be used only once per cycle; the picker hides already-used
  ones (except the currently selected one, so edits still work).
- **Moods** — keyed by day-of-year 1–365 for **2026 specifically**
  (`dayOfYear2026`, `DAYS_2026`); a day holds up to two mood ids rendered as a
  left-to-right gradient on a canvas backed at device pixel ratio. Stored as one
  JSON blob per user per year in `mood_years`. Rolling this into another year
  means touching those helpers, not just data.
- **Rich text** — `renderRichText()` supports `@name`, `@{Multi Word Name}`,
  `**bold**`, `*italic*`. Styles don't nest and don't span newlines; the bold
  alternative must stay before italic in `RICH_TEXT_PATTERN`.
- **Drafts** — the Fill Form autosaves to Supabase (one row per user) ~1s after
  typing stops and flushes on unmount, so a half-written entry follows the user
  across devices. The restore/skip/submitted refs in `EntryForm` exist to keep
  the restore from immediately re-triggering a save; be careful editing them.

## Keepsake suggestions (LLM)

`fetchKeepsakeSuggestions()` builds one big user message from
`SUGGESTION_SYSTEM_PROMPT` + a generated catalog of all 58 Keepsakes with their
`TOPICS`, and invokes the `suggest-keepsakes` Supabase Edge Function
(`setup/edge-function.ts`), which relays to the Anthropic Messages API using the
`ANTHROPIC_API_KEY` secret stored in Supabase. The key must never reach the
browser or the repo. The function passes Anthropic's response object straight
through; the app extracts text blocks and parses the first `{`…last `}` as JSON.
Set `ENABLE_SUGGESTIONS = false` to hide the feature when the function isn't
deployed.

## Styling

Tailwind is configured **dark-first by remapping the default palette**
(`tailwind.config.js`): `white` is a raised dark surface, `gray-50…300` are
surfaces/borders, `gray-400…900` are text getting *lighter* as the number grows.
So `bg-gray-900 text-white` is still the inverted primary button. Write new
markup using the same light-palette class names and it will come out dark — do
not add `dark:` variants or hardcode hexes for anything the palette covers.
Page background `#101418` and mood/keepsake accent colors are the exceptions and
are set inline.

`src/index.css` carries hard-won iOS Safari workarounds for
`input[type=date|datetime-local]` sizing and a matching `select` height; the
comments there explain why each line exists. Root font-size bumps to 17px under
520px, which is also the `useIsNarrow()` breakpoint used to switch tab labels.

## Communication

Richard is new to development. Explain in plain language, avoid jargon
without defining it, and keep summaries short. When reporting what you
changed, lead with what it means for the app, not the implementation.
Ask before making changes beyond what was requested.

## Conventions

- American spelling throughout (color, center, centering, behavior).
- Explain in plain language; Richard is new to development.
- Ask before making changes beyond what was requested.