'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, AlertCircle, LogIn, Home } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';
import { DASHBOARD_ROLES } from '@/lib/role-config';

export const dynamic = 'force-dynamic';

// ─── mode types ────────────────────────────────────────────────────────────────
type Mode = 'signin' | 'signup';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]  = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]     = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // reset error when switching modes
  useEffect(() => { setError(''); }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Wraps any promise with a timeout so DB hangs don't freeze the UI forever
    function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
      return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), ms)
        ),
      ]);
    }

    try {
      if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your name.'); setIsLoading(false); return; }

        const { data, error: signUpError } = await withTimeout(
          signUp.email({ email, password, name: name.trim() }),
          25000
        );

        if (!signUpError && data) { router.push('/'); return; }

        const msg = (signUpError as any)?.message || (signUpError as any)?.error || '';
        if (msg.toLowerCase().includes('already exists')) {
          setError('An account with this email already exists. Please sign in.');
        } else if (!msg) {
          setError('Database unreachable — server is running but database is not responding. Check DATABASE_URL in server/.env and restart the server.');
        } else {
          setError(msg);
        }
        return;
      }

      // ── Sign In ──────────────────────────────────────────────────────────
      const { data: signInData, error: signInError } = await withTimeout(
        signIn.email({ email, password }),
        25000
      );

      if (!signInError && signInData) {
        const role = (signInData.user as any)?.role;
        if (role === 'agency') {
          router.push('/agency/contracts');
        } else if (DASHBOARD_ROLES.includes(role)) {
          router.push(callbackUrl);
        } else {
          router.push('/');
        }
        return;
      }

      const signInMsg = (signInError as any)?.message || (signInError as any)?.error || '';

      if (!signInMsg) {
        // Empty error = server responded but DB failed internally
        setError('Database unreachable — server is up but cannot connect to MySQL database. Check DATABASE_URL in server/.env and restart the server.');
      } else if (
        signInMsg.toLowerCase().includes('invalid') ||
        signInMsg.toLowerCase().includes('password') ||
        signInMsg.toLowerCase().includes('credentials')
      ) {
        setError('Invalid email or password.');
      } else {
        setError(signInMsg);
      }

    } catch (err: any) {
      const msg: string = err?.message || '';
      if (msg === 'TIMEOUT') {
        setError('Request timed out — server is running but MySQL database is not responding. Check DATABASE_URL in server/.env and restart the server.');
      } else if (msg === 'Failed to fetch' || msg.includes('ECONNREFUSED')) {
        setError('Cannot reach backend server — please check backend server URL and connectivity.');
      } else {
        setError(msg || 'An unexpected error occurred.');
      }
      console.error('Auth error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden select-none">
      {/* ── Sky-blue gradient background ───────────────────────────────────── */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(160deg, #d6edf8 0%, #b8ddf0 30%, #a0cfe8 60%, #c8e8f5 100%)',
        }}
      />

      {/* Subtle cloud-like blobs */}
      {mounted && (
        <>
          <div className="absolute bottom-0 left-[-5%] w-[55%] h-[45%] rounded-[60%] bg-white/25 blur-3xl" />
          <div className="absolute bottom-[-10%] right-[5%] w-[50%] h-[50%] rounded-[60%] bg-white/20 blur-3xl" />
          <div className="absolute top-[15%] right-[-5%] w-[35%] h-[35%] rounded-full bg-white/15 blur-3xl" />
          {/* Decorative thin arc */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-white/30 pointer-events-none"
            style={{ transform: 'translate(-50%, -30%) rotate(-20deg)' }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/20 pointer-events-none"
            style={{ transform: 'translate(-50%, -25%) rotate(-20deg)' }}
          />
        </>
      )}

      {/* ── Card ───────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[400px] px-4">

        {/* Back to Home */}
        <div className="mb-3 flex">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-sky-700/70 hover:text-sky-800 transition-colors group"
          >
            <span className="w-6 h-6 rounded-lg bg-white/60 backdrop-blur border border-white/70 shadow-sm flex items-center justify-center group-hover:bg-white transition-colors">
              <Home size={12} className="text-sky-700" />
            </span>
            Back to Home
          </Link>
        </div>

        <div className="rounded-3xl bg-white/80 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,80,160,0.12),0_4px_16px_rgba(0,80,160,0.08)] border border-white/70 px-8 py-9">

          {/* Icon pill */}
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-[0_4px_16px_rgba(0,0,0,0.10)] border border-gray-100 flex items-center justify-center">
              <LogIn size={22} className="text-gray-700" strokeWidth={1.8} />
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-[22px] font-bold text-gray-900 leading-tight">
              {mode === 'signin' ? 'Sign in with email' : 'Create your account'}
            </h1>
            <p className="text-[13px] text-gray-500 mt-1.5 leading-snug">
              {mode === 'signin'
                ? 'Welcome back to the SKY agency portal.'
                : 'Fill in the details below to get started.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[13px] mb-5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name field — sign up only */}
            {mode === 'signup' && (
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[13px] pointer-events-none">
                  👤
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  required
                  disabled={isLoading}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 text-[14px] focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m2 7 10 7 10-7" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                disabled={isLoading}
                autoComplete="email"
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 text-[14px] focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                disabled={isLoading}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full pl-9 pr-11 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 text-[14px] focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-50"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPwd((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPwd
                  ? <EyeOff size={16} />
                  : <Eye size={16} />
                }
              </button>
            </div>

            {/* Forgot password link — sign in only */}
            {mode === 'signin' && (
              <div className="flex justify-end -mt-1">
                <button
                  type="button"
                  className="text-[12px] text-gray-500 hover:text-gray-700 transition-colors"
                  onClick={() => setError('Password reset is not available yet. Contact your administrator.')}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3 mt-1 rounded-xl bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white font-semibold text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.18)]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                </>
              ) : (
                mode === 'signin' ? 'Get Started' : 'Create Account'
              )}
            </button>
          </form>

          {/* Mode switcher */}
          <p className="text-center text-[13px] text-gray-500 mt-5">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        {/* Footer label */}
        <p className="text-center text-[11px] text-sky-700/60 mt-4 tracking-wide">
          SKY Foreign Employment Agency System
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #d6edf8 0%, #b8ddf0 50%, #a0cfe8 100%)' }}>
          <Loader2 className="animate-spin text-sky-600" size={28} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
