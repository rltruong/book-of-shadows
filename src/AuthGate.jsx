// Sign-in gate: no passwords — Supabase emails a one-time login link. Once
// signed in, the session persists in this browser until you sign out, and the
// same account on any device sees the same data.

import React, { useEffect, useState } from 'react';
import { supabase } from './db';
import { SUPABASE_URL } from './config';

const notConfigured = SUPABASE_URL.startsWith('PASTE_');

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (notConfigured) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
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

  if (!ready) {
    return (
      <Shell>
        <p className="text-sm text-gray-400">Loading…</p>
      </Shell>
    );
  }

  if (session) return children;

  async function sendLink() {
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    if (err) setError(err.message);
    else setSent(true);
  }

  return (
    <Shell>
      {sent ? (
        <p className="text-sm text-gray-700 leading-relaxed">
          Check your email — a login link is on its way to{' '}
          <span className="font-medium">{email}</span>. Opening it brings you
          right back here, signed in.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-3">
            Sign in with your email. No password — a one-time link is sent to
            your inbox.
          </p>
          <input
            type="email"
            value={email}
            placeholder="you@example.com"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && email.includes('@')) sendLink();
            }}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-base mb-2 bg-white text-gray-900 focus:outline-none focus:border-gray-500"
          />
          <button
            type="button"
            disabled={!email.includes('@')}
            onClick={sendLink}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-40 rounded-md transition-colors"
          >
            Send login link
          </button>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </>
      )}
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center p-4">
      <div className="w-full bg-white border border-gray-200 rounded-lg p-6" style={{ maxWidth: 360 }}>
        <h1 className="text-xl font-semibold text-gray-900">Keepsake Log</h1>
        <p className="text-gray-500 text-xs mt-0.5 mb-5">
          A microblog for the Hobonichi-bound, with a Year in Pixels
        </p>
        {children}
      </div>
    </div>
  );
}
