'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle } from 'lucide-react';
import { signIn, signUp } from '@/lib/auth-client';
import { DASHBOARD_ROLES } from '@/lib/role-config';

export const dynamic = 'force-dynamic';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Animated background orbs
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 1. Attempt Sign In
      const { data: signInData, error: signInError } = await signIn.email({
        email,
        password,
      });

      if (!signInError && signInData) {
        // Sign in success! Check role for redirection
        const user = signInData.user as any;
        const role = user?.role;
        console.log("Sign in successful. User role:", role);
        
        if (role === 'agency') {
          router.push('/agency/contracts');
        } else if (DASHBOARD_ROLES.includes(role)) {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
        return;
      }

      // Extract a readable sign-in error message
      const signInMsg = (signInError as any)?.message
        || (signInError as any)?.error
        || (typeof signInError === 'string' ? signInError : null)
        || '';

      console.log("Sign in failed:", signInMsg || '(no message — server may be unreachable or returned 500)');

      // 2. If Sign In failed, only try Sign Up if the error suggests the user doesn't exist.
      // If the error message clearly says invalid credentials, skip sign-up attempt.
      const looksLikeWrongPassword =
        signInMsg.toLowerCase().includes('invalid') ||
        signInMsg.toLowerCase().includes('password') ||
        signInMsg.toLowerCase().includes('credentials');

      if (looksLikeWrongPassword) {
        setError('Invalid email or password');
        return;
      }

      // Attempt auto-registration for potentially new users
      const namePrefix = email.split('@')[0];
      const displayName = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);

      const { data: signUpData, error: signUpError } = await signUp.email({
        email,
        password,
        name: displayName,
      });

      if (!signUpError && signUpData) {
        console.log("Auto-registration successful for new user.");
        router.push('/');
        return;
      }

      const signUpMsg = (signUpError as any)?.message
        || (signUpError as any)?.error
        || (typeof signUpError === 'string' ? signUpError : null)
        || '';

      // 3. Both failed — determine best error message
      if (
        signUpMsg.toLowerCase().includes('already exists') ||
        (signUpError as any)?.code === 'USER_ALREADY_EXISTS'
      ) {
        // User exists but wrong password
        setError('Invalid email or password');
      } else if (!signInMsg && !signUpMsg) {
        // Both errors were empty objects — server is likely down or returned 500
        setError('Cannot connect to server. Please make sure the backend is running and try again.');
        console.error("Auth failed with empty error objects — server may be down or returning 500", { signInError, signUpError });
      } else {
        setError(signUpMsg || signInMsg || 'Authentication failed');
        console.error("Auth Fail Details:", { signInError, signUpError });
      }
      
    } catch (err: any) {
      console.error("Critical Auth Error:", err);
      if (err?.message === 'Failed to fetch' || err?.cause?.code === 'ECONNREFUSED') {
        setError('Cannot reach the server. Please check that the backend is running on port 4000.');
      } else {
        setError(err.message || 'An unexpected error occurred during authentication');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0a0f]">
      {/* Animated background orbs */}
      {mounted && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary-light/20 blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-cyan-600/10 blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        </>
      )}

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_32px_64px_rgba(0,0,0,0.5)] p-8"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-[0_8px_32px_rgba(37,99,235,0.4)] mb-4">
              <span className="text-white font-black text-2xl tracking-tight">C</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">COOLSTAFF</h1>
            <p className="text-white/40 text-sm mt-1 tracking-widest uppercase text-[10px]">
              Employment Agency
            </p>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-lg font-semibold text-white">Welcome to Coolstaff</h2>

          </div>

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-5">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-primary/60 focus:bg-white/8 transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-white/60 text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/20 text-sm focus:outline-none focus:border-primary/60 focus:bg-white/8 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-all shadow-[0_4px_24px_rgba(37,99,235,0.35)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-white/20 text-xs mt-8">
            COOLSTAFF — Foreign Employment Agency System
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
