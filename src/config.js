// ============================================================
// THE ONLY FILE YOU NEED TO EDIT.
//
// Fill in the two values below from your Supabase project:
//   Dashboard → Project Settings → API Keys
//
// SUPABASE_URL  looks like: https://abcdefghij.supabase.co
// SUPABASE_KEY  is the "publishable" key (sb_publishable_...).
//   (If your project shows legacy keys, the "anon public" key
//    works too.) This key is SAFE to publish — it can only do
//    what your Row Level Security policies allow.
//
// Never put a secret key (sb_secret_...) or your Anthropic
// key in this file. The Anthropic key lives only in the
// Edge Function's secrets on Supabase.
// ============================================================

export const SUPABASE_URL = 'PASTE_YOUR_SUPABASE_URL_HERE';
export const SUPABASE_KEY = 'PASTE_YOUR_PUBLISHABLE_KEY_HERE';

// Set to false to hide the LLM Keepsake suggestions (e.g. if you
// haven't set up the Edge Function yet).
export const ENABLE_SUGGESTIONS = true;
