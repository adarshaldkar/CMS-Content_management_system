import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Shield, ArrowRight, Eye, EyeOff, AlertCircle, Sparkles, CheckCircle2, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { authApi } from '../../api/auth.api';

interface ReadingPaywallGateProps {
  articleTitle: string;
  articleSlug: string;
  previewSeconds?: number;
}

export const ReadingPaywallGate: React.FC<ReadingPaywallGateProps> = ({
  articleTitle,
  articleSlug,
  previewSeconds = 7,
}) => {
  const { isAuthenticated, setAuthUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [timeLeft, setTimeLeft] = useState<number>(previewSeconds);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');

  // Form states for frictionless inline auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Countdown timer for complimentary reading preview
  useEffect(() => {
    if (isAuthenticated) {
      setIsLocked(false);
      return;
    }

    if (timeLeft <= 0) {
      setIsLocked(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthenticated, timeLeft]);

  // 2. Lock / unlock background body scrolling when paywall activates
  useEffect(() => {
    if (isLocked && !isAuthenticated) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isLocked, isAuthenticated]);

  // Handle inline quick login
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await authApi.login({ email, password });
      setAuthUser(response.user as any);
      setSuccessMessage('Welcome back! Full story unlocked.');
      setTimeout(() => {
        setIsLocked(false);
      }, 500);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setErrorMessage('Too many login attempts. Please wait a moment.');
      } else {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle inline quick registration
  const handleInlineRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;

    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters with uppercase, lowercase & numbers.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await authApi.register({ name, email, password });
      setAuthUser(response.user as any);
      setSuccessMessage('Account created! Welcome to The Gazette.');
      setTimeout(() => {
        setIsLocked(false);
      }, 500);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage('An account with this email already exists. Please sign in instead.');
        setActiveTab('signin');
      } else {
        setErrorMessage(err.response?.data?.message || 'Registration failed. Please check your details.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Preview Countdown Toast (Visible before lock triggers) */}
      {!isLocked && timeLeft > 0 && (
        <aside
          aria-label="Preview time remaining"
          className="fixed bottom-6 right-6 z-40 bg-ink-primary/95 text-white backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 font-sans"
        >
          <div className="w-8 h-8 rounded-full bg-accent-crimson flex items-center justify-center text-white shrink-0 animate-pulse">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-semibold">
              Complimentary Preview
            </p>
            <p className="text-xs text-slate-200">
              <span className="font-bold text-white font-mono text-sm">{timeLeft}</span>s remaining before member sign-in
            </p>
          </div>
        </aside>
      )}

      {/* 2. Strict Paywall Modal Overlay (Visible when preview expires) */}
      {isLocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="paywall-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-300 select-none overflow-y-auto"
        >
          <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-border-subtle dark:border-stone-700 rounded-2xl shadow-2xl overflow-hidden my-8 font-sans">
            {/* Top Ornamental Crimson Bar */}
            <div className="h-1.5 bg-gradient-to-r from-accent-crimson via-rose-500 to-amber-500" />

            <div className="p-6 sm:p-8 space-y-6">
              {/* Header Badge */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-full text-accent-crimson dark:text-rose-400 text-[11px] font-mono font-semibold uppercase tracking-wider">
                  <Lock size={12} />
                  <span>Member-Exclusive Manuscript</span>
                </div>

                <h2 id="paywall-title" className="text-2xl sm:text-3xl font-editorial font-bold text-ink-primary dark:text-stone-100 tracking-tight leading-snug pt-1">
                  Continue Reading This Story
                </h2>

                <p className="text-xs sm:text-sm text-ink-secondary dark:text-stone-400 leading-relaxed max-w-md mx-auto">
                  You've reached the end of your free preview for{' '}
                  <span className="font-semibold text-ink-primary dark:text-stone-200 italic font-serif">
                    "{articleTitle}"
                  </span>
                  . Sign in or register in seconds to unlock full, unrestricted access.
                </p>
              </div>

              {/* Status Notifications */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 font-medium">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Tabs: Sign In / Create Account */}
              <div className="flex border-b border-border-subtle dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('signin');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors font-mono ${
                    activeTab === 'signin'
                      ? 'border-b-2 border-accent-crimson text-accent-crimson font-bold'
                      : 'text-ink-secondary dark:text-stone-400 hover:text-ink-primary'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMessage(null);
                  }}
                  className={`flex-1 pb-2.5 text-xs font-semibold uppercase tracking-wider transition-colors font-mono ${
                    activeTab === 'register'
                      ? 'border-b-2 border-accent-crimson text-accent-crimson font-bold'
                      : 'text-ink-secondary dark:text-stone-400 hover:text-ink-primary'
                  }`}
                >
                  Create Free Account
                </button>
              </div>

              {/* Inline Auth Form */}
              {activeTab === 'signin' ? (
                <form onSubmit={handleInlineLogin} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold text-ink-primary dark:text-stone-200 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-stone-800 border border-border-subtle dark:border-stone-700 rounded-lg focus:outline-none focus:border-ink-primary dark:focus:border-stone-100"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold text-ink-primary dark:text-stone-200">
                        Password
                      </label>
                      <Link
                        to={`/forgot-password?redirect=/articles/${articleSlug}`}
                        className="text-[11px] text-accent-crimson hover:underline"
                      >
                        Forgot?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 pr-10 text-xs bg-slate-50 dark:bg-stone-800 border border-border-subtle dark:border-stone-700 rounded-lg focus:outline-none focus:border-ink-primary dark:focus:border-stone-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-secondary"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-ink-primary hover:bg-slate-800 dark:bg-stone-100 dark:hover:bg-white text-white dark:text-stone-900 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Verifying...' : 'Unlock Story Now'}</span>
                    <ArrowRight size={14} />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleInlineRegister} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold text-ink-primary dark:text-stone-200 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-stone-800 border border-border-subtle dark:border-stone-700 rounded-lg focus:outline-none focus:border-ink-primary dark:focus:border-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold text-ink-primary dark:text-stone-200 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-stone-800 border border-border-subtle dark:border-stone-700 rounded-lg focus:outline-none focus:border-ink-primary dark:focus:border-stone-100"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider font-semibold text-ink-primary dark:text-stone-200 mb-1">
                      Password (min. 10 chars)
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password123!"
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-stone-800 border border-border-subtle dark:border-stone-700 rounded-lg focus:outline-none focus:border-ink-primary dark:focus:border-stone-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-accent-crimson hover:bg-rose-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
                  >
                    <span>{isSubmitting ? 'Creating Account...' : 'Create Account & Read Free'}</span>
                    <Sparkles size={14} />
                  </button>
                </form>
              )}

              {/* Security & Value Assurance */}
              <div className="pt-3 border-t border-border-subtle dark:border-stone-800 flex items-center justify-center gap-4 text-[11px] font-mono text-ink-secondary dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <Shield size={12} className="text-emerald-600" />
                  <span>Zero-Spam Guarantee</span>
                </span>
                <span>·</span>
                <span>Instant Free Access</span>
                <span>·</span>
                <span>Unlimited Stories</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
