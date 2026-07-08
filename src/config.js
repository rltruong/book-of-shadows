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

export const SUPABASE_URL = 'https://ywxfqvxnbslhuunrqklr.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_r5z8GHtantwACFPl0_N0MQ__CSZkb-S';

// Set to false to hide the LLM Keepsake suggestions (e.g. if you
// haven't set up the Edge Function yet).
export const ENABLE_SUGGESTIONS = true;
