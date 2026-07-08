// Drop-in replacement for the Claude artifact's `window.storage`, backed by the
// browser's localStorage so the app runs as a plain static site. The app code
// keeps calling window.storage.get/set/delete/list unchanged.
//
// This persists per-device (per-browser). For cross-device sync, swap this
// layer for Supabase — see DEPLOYMENT.md.

import seed from './seed';

const PREFIX = 'kl:'; // namespace so we don't collide with anything else

function realKey(key) {
  return PREFIX + key;
}

const storage = {
  async get(key) {
    const value = localStorage.getItem(realKey(key));
    return value === null ? null : { key, value };
  },
  async set(key, value) {
    localStorage.setItem(realKey(key), value);
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(realKey(key));
    return { key, deleted: true };
  },
  async list(prefix = '') {
    const want = PREFIX + prefix;
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(want)) keys.push(k.slice(PREFIX.length));
    }
    return { keys };
  },
};

// One-time seed: if this browser has no data yet, load the exported entries and
// moods so your history shows up on first visit. After that, the browser's own
// data is the source of truth and the seed is never applied again.
function seedIfEmpty() {
  if (localStorage.getItem(PREFIX + '__seeded') === '1') return;

  const hasEntries = (() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + 'entry:')) return true;
    }
    return false;
  })();
  const hasMoods = localStorage.getItem(PREFIX + 'moods:2026') !== null;

  if (!hasEntries && !hasMoods) {
    for (const entry of seed.entries) {
      localStorage.setItem(PREFIX + 'entry:' + entry.id, JSON.stringify(entry));
    }
    localStorage.setItem(PREFIX + 'moods:2026', JSON.stringify(seed.moods));
  }
  localStorage.setItem(PREFIX + '__seeded', '1');
}

seedIfEmpty();

if (typeof window !== 'undefined') {
  window.storage = storage;
}

export default storage;
