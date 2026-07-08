// Sign-in gate: email + password, no emails sent. Create your user once in the
// Supabase dashboard (Authentication -> Users -> Add user, "Auto Confirm User"
// checked), then sign in here with that password.
//
// Session behavior mirrors the Expense Tracker: a rolling 72-hour window.
// Every open inside the window refreshes the timestamp, so the sign-in screen
// only returns after ~72h of NOT opening the app. The window is checked
// synchronously first so there's no login-screen flash on load; the live
// Supabase session is then confirmed in the background. Unlike the Expense
// Tracker there is no local cache to fall back on, so if the live session is
// gone the gate is shown even inside the window.

import React, { useEffect, useState } from 'react';
import { supabase } from './db';
import { SUPABASE_URL } from './config';

const notConfigured = SUPABASE_URL.startsWith('PASTE_');

const AUTH_TS_KEY = 'bos_auth_last_ok';
const AUTH_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours

function withinWindow() {
  try {
    const t = parseInt(localStorage.getItem(AUTH_TS_KEY) || '0', 10);
    return t > 0 && Date.now() - t < AUTH_TTL_MS;
  } catch {
    return false;
  }
}

function stampNow() {
  try {
    localStorage.setItem(AUTH_TS_KEY, String(Date.now()));
  } catch {
    /* storage unavailable; gate simply reappears next time */
  }
}

export default function AuthGate({ children }) {
  // Synchronous first read: inside the 72h window we render the app
  // immediately (no flash) and confirm the session in the background.
  const [authed, setAuthed] = useState(() => !notConfigured && withinWindow());
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (notConfigured) {
      setReady(true);
      return;
    }

    let cancelled = false;

    if (withinWindow()) {
      // Rolling window: opening the app resets the clock.
      stampNow();
      setReady(true);
      // Confirm the live session quietly; if it's actually gone, drop to the
      // gate (no local cache to serve from, unlike the Expense Tracker).
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (cancelled) return;
          if (!data?.session) {
            setAuthed(false);
            setError('Session expired — please sign in again.');
          }
        })
        .catch(() => {
          /* transient failure: keep optimistic render; data layer will surface errors */
        });
    } else {
      // Outside the window: confirm a live session before skipping the gate.
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (cancelled) return;
          if (data?.session) {
            stampNow();
            setAuthed(true);
          }
          setReady(true);
        })
        .catch(() => {
          if (!cancelled) setReady(true);
        });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (cancelled) return;
      if (s) {
        stampNow();
        setAuthed(true);
      } else {
        try {
          localStorage.removeItem(AUTH_TS_KEY);
        } catch {
          /* ignore */
        }
        setAuthed(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (notConfigured) {
    return (
      <Shell>
        <p className="text-sm text-gray-700 leading-relaxed">
          Almost there — open <code className="bg-gray-100 px-1 rounded">src/config.js</code>{' '}
          and paste in your Supabase URL and publishable key, then redeploy.
        </p>
      </Shell>
    );
  }

  if (authed) return children;

  if (!ready) {
    return (
      <Shell>
        <p className="text-sm text-gray-400">Loading…</p>
      </Shell>
    );
  }

  async function signIn() {
    if (busy) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err) setError(err.message);
    else stampNow();
    setBusy(false);
  }

  const canSubmit = email.includes('@') && password.length > 0 && !busy;

  return (
    <Shell>
      <input
        type="email"
        value={email}
        placeholder="Email"
        autoComplete="email"
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-base mb-2 bg-white text-gray-900 focus:outline-none focus:border-gray-500"
      />
      <input
        type="password"
        value={password}
        placeholder="Password"
        autoComplete="current-password"
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && canSubmit) signIn();
        }}
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-base mb-2 bg-white text-gray-900 focus:outline-none focus:border-gray-500"
      />
      <button
        type="button"
        disabled={!canSubmit}
        onClick={signIn}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 rounded-md transition-colors"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      <div className="w-full bg-white border border-gray-200 rounded-lg p-6" style={{ maxWidth: 360 }}>
        <h1 className="text-xl font-semibold text-gray-900">Book of Shadows</h1>
        <p className="text-gray-500 text-xs mt-0.5 mb-5">
          Digital working surface for to-dos, microblogging, and tracking mood in
          a Year in Pixels matrix
        </p>
        {children}
      </div>
    </div>
  );
}
