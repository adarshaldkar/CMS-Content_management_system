import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  CheckCircle2,
  Cookie,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Shield,
  Smartphone,
  Sliders,
} from 'lucide-react';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[a-z]/, 'Must include at least one lowercase letter')
      .regex(/[0-9]/, 'Must include at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must include at least one special symbol'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ['confirmPassword'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

export const UserSettingsPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOutAll, setIsLoggingOutAll] = useState(false);

  // ─── Cookie Preferences ───────────────────────────────────────────
  const [cookiePrefs, setCookiePrefs] = useState({
    analytics: true,
    functional: true,
    marketing: false,
  });
  const [cookieSaveStatus, setCookieSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('gazette_cookie_consent_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.categories) {
          setCookiePrefs({
            analytics: parsed.categories.analytics ?? true,
            functional: parsed.categories.functional ?? true,
            marketing: parsed.categories.marketing ?? false,
          });
        }
      }
    } catch {
      // Ignore malformed storage
    }
  }, []);

  const handleSaveCookiePrefs = async () => {
    setCookieSaveStatus('saving');
    const categories = { strictlyNecessary: true, ...cookiePrefs };

    localStorage.setItem(
      'gazette_cookie_consent_v1',
      JSON.stringify({ choice: 'customized', categories, timestamp: new Date().toISOString() }),
    );

    try {
      await fetch('/api/legal/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentType: 'cookie_policy', version: 'v1.0', choice: 'customized', categories }),
      });
      setCookieSaveStatus('saved');
    } catch {
      setCookieSaveStatus('error');
    } finally {
      setTimeout(() => setCookieSaveStatus('idle'), 3000);
    }
  };
  // ─────────────────────────────────────────────────────────────────

  const { clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormData) => {
    setIsSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      setSuccessMessage('Password changed successfully. All other active sessions have been invalidated.');
      reset();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to change password. Please verify your current password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Are you sure you want to sign out from all devices? You will need to log in again.')) {
      return;
    }

    setIsLoggingOutAll(true);
    try {
      await authApi.logoutAll();
    } catch {
      // Clear state regardless of network response
    } finally {
      clearAuth();
      navigate('/login');
    }
  };

  return (
    <div className="max-w-3xl space-y-8 font-sans">
      <div>
        <h1 className="text-2xl font-editorial font-bold text-ink-primary">Account Security</h1>
        <p className="text-xs text-ink-secondary mt-0.5">
          Manage your password credentials, authentication sessions, and security policies
        </p>
      </div>

      {/* Change Password Card */}
      <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border-subtle mb-6">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-ink-primary">
            <KeyRound size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink-primary">Change Password</h2>
            <p className="text-[11px] text-ink-secondary">
              Update your account password using our secure registration policy
            </p>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-700 font-medium">
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
              Current Password
            </label>
            <div className="mt-1.5 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('currentPassword')}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
              />
              <Lock size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-secondary hover:text-ink-primary"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
              New Password
            </label>
            <div className="mt-1.5 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('newPassword')}
                placeholder="Min 10 chars, uppercase, number & symbol"
                className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
              />
              <Lock size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
            </div>
            {errors.newPassword && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
              Confirm New Password
            </label>
            <div className="mt-1.5 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
              />
              <Shield size={15} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50 mt-2"
          >
            <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
          </button>
        </form>
      </div>

      {/* Session Management Card */}
      <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border-subtle mb-6">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-ink-primary">
            <Smartphone size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink-primary">Active Sessions</h2>
            <p className="text-[11px] text-ink-secondary">
              Devices and browsers currently authenticated with your account
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg border border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <div>
                <p className="text-xs font-semibold text-ink-primary">Current Web Session</p>
                <p className="text-[11px] font-mono text-ink-secondary">
                  Protected with HttpOnly refresh cookies & automatic rotation
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-mono font-medium">
              Active Now
            </span>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogoutAll}
              disabled={isLoggingOutAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <LogOut size={14} />
              <span>{isLoggingOutAll ? 'Revoking sessions...' : 'Sign Out of All Devices'}</span>
            </button>
          </div>
        </div>
      </div>
      {/* Cookie Preferences Card */}
      <div className="bg-white border border-border-subtle rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2.5 pb-4 border-b border-border-subtle mb-6">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
            <Cookie size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-ink-primary">Cookie Preferences</h2>
            <p className="text-[11px] text-ink-secondary">
              Control optional analytics, personalisation, and marketing cookies
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Strictly Necessary — always on */}
          <div className="p-3 rounded-lg border border-border-subtle bg-slate-50 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-ink-primary flex items-center gap-1.5">
                Strictly Necessary
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                  Always Active
                </span>
              </p>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Required for secure authentication, CSRF defense, and session persistence.
              </p>
            </div>
            <input type="checkbox" checked disabled className="h-4 w-4 rounded accent-amber-500 cursor-not-allowed opacity-50" />
          </div>

          {/* Analytics */}
          <label className="p-3 rounded-lg border border-border-subtle bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="pr-4">
              <p className="text-xs font-semibold text-ink-primary">Analytics &amp; Performance</p>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Measures reader traffic, scroll depth, and page performance.
              </p>
            </div>
            <input
              type="checkbox"
              checked={cookiePrefs.analytics}
              onChange={(e) => setCookiePrefs({ ...cookiePrefs, analytics: e.target.checked })}
              className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
            />
          </label>

          {/* Functional */}
          <label className="p-3 rounded-lg border border-border-subtle bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="pr-4">
              <p className="text-xs font-semibold text-ink-primary">Functional &amp; Preferences</p>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Remembers reading layout, font sizing, and dark/light mode across sessions.
              </p>
            </div>
            <input
              type="checkbox"
              checked={cookiePrefs.functional}
              onChange={(e) => setCookiePrefs({ ...cookiePrefs, functional: e.target.checked })}
              className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
            />
          </label>

          {/* Marketing */}
          <label className="p-3 rounded-lg border border-border-subtle bg-white flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="pr-4">
              <p className="text-xs font-semibold text-ink-primary">Personalised Recommendations</p>
              <p className="text-[11px] text-ink-secondary mt-0.5">
                Topic curation based on your reading history and newsletter subscriptions.
              </p>
            </div>
            <input
              type="checkbox"
              checked={cookiePrefs.marketing}
              onChange={(e) => setCookiePrefs({ ...cookiePrefs, marketing: e.target.checked })}
              className="h-4 w-4 rounded accent-amber-500 cursor-pointer"
            />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveCookiePrefs}
            disabled={cookieSaveStatus === 'saving'}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50"
          >
            <Sliders size={14} />
            <span>{cookieSaveStatus === 'saving' ? 'Saving...' : 'Save Preferences'}</span>
          </button>
          {cookieSaveStatus === 'saved' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle2 size={14} />
              Preferences saved
            </span>
          )}
          {cookieSaveStatus === 'error' && (
            <span className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <AlertCircle size={14} />
              Could not sync — preferences saved locally
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
