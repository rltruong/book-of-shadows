// Data layer: everything the app reads/writes goes through here, backed by
// Supabase (Postgres). Signing in with the same email on any device shows the
// same data — this is what replaces the per-device localStorage.

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config';
import seed from './seed';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- row <-> entry mapping (snake_case in Postgres, camelCase in the app) ----
const rowToEntry = (r) => ({
  id: r.id,
  keepsakeName: r.keepsake_name,
  emoji: r.emoji,
  datetime: r.datetime_local,
  title: r.title,
  content: r.content,
  createdAt: r.created_at,
  updatedAt: r.updated_at ?? undefined,
});

const entryToRow = (e) => ({
  id: e.id,
  keepsake_name: e.keepsakeName,
  emoji: e.emoji,
  datetime_local: e.datetime,
  title: e.title,
  content: e.content,
  created_at: e.createdAt,
  updated_at: e.updatedAt ?? null,
});

// ---- entries ----
export async function listEntries() {
  const { data, error } = await supabase.from('entries').select('*');
  if (error) throw error;
  return data.map(rowToEntry);
}

export async function upsertEntry(entry) {
  const { error } = await supabase.from('entries').upsert(entryToRow(entry));
  if (error) throw error;
}

export async function deleteEntry(id) {
  const { error } = await supabase.from('entries').delete().eq('id', id);
  if (error) throw error;
}

// ---- moods: one JSON blob per year, same shape the app already uses ----
export async function loadMoods(year = 2026) {
  const { data, error } = await supabase
    .from('mood_years')
    .select('data')
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data?.data ?? {};
}

export async function saveMoods(next, year = 2026) {
  const { error } = await supabase
    .from('mood_years')
    .upsert({ year, data: next }, { onConflict: 'user_id,year' });
  if (error) throw error;
}

// ---- one-time migration ----
// On first login, if this account has no data at all, push the seed (your
// export from the artifact/static version) into Supabase. Runs once per
// account; after that Supabase is the single source of truth.
export async function migrateSeedIfEmpty() {
  const entries = await listEntries();
  const moods = await loadMoods();
  const empty = entries.length === 0 && Object.keys(moods).length === 0;
  if (!empty) return false;

  if (seed.entries?.length) {
    const rows = seed.entries.map(entryToRow);
    const { error } = await supabase.from('entries').upsert(rows);
    if (error) throw error;
  }
  if (seed.moods && Object.keys(seed.moods).length) {
    await saveMoods(seed.moods);
  }
  return true;
}
