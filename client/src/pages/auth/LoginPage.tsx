import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setAuthUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Countdown timer for 429 Too Many Requests rate limiting
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) return;

    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  const onSubmit = async (data: LoginFormData) => {
    if (rateLimitCountdown !== null && rateLimitCountdown > 0) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await authApi.login({
        email: data.email,
        password: data.password,
      });

      setAuthUser(response.user as any);
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err.response?.status === 429) {
        setRateLimitCountdown(60);
        setErrorMessage('Too many login attempts. Please wait before trying again.');
      } else if (err.response?.status === 401 || err.response?.status === 400) {
        setErrorMessage('Invalid email or password. Please verify your credentials.');
      } else {
        setErrorMessage('An unexpected error occurred during sign in. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <BrandLogo size="lg" showSubtitle />
        <h2 className="mt-6 text-2xl font-editorial font-bold text-ink-primary">
          Sign in to your account
        </h2>
        <p className="mt-1.5 text-xs text-ink-secondary">
          Access your author workspace, draft stories, and editorial tools
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-border-subtle rounded-xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={17} className="text-rose-600 mt-0.5 shrink-0" />
              <div className="text-xs text-rose-700 font-medium">
                {errorMessage}
                {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
                  <p className="mt-1 font-mono text-[11px] text-rose-800">
                    Retry available in: {rateLimitCountdown}s
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                Email Address
              </label>
              <div className="mt-1.5 relative">
                <input
                  type="email"
                  {...register('email')}
                  autoComplete="email"
                  placeholder="author@gazette.io"
                  className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
                />
                <Mail size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-accent-crimson hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1.5 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
                />
                <Lock size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-secondary hover:text-ink-primary"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                {...register('rememberMe')}
                className="h-4 w-4 text-accent-crimson focus:ring-accent-crimson border-border-subtle rounded"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-xs text-ink-secondary">
                Remember this device for 30 days
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || (rateLimitCountdown !== null && rateLimitCountdown > 0)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span>Signing in...</span>
              ) : rateLimitCountdown !== null && rateLimitCountdown > 0 ? (
                <span>Locked ({rateLimitCountdown}s)</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border-subtle text-center">
            <p className="text-xs text-ink-secondary">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent-crimson font-semibold hover:underline">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
