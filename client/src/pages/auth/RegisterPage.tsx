import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(10, 'Password must be at least 10 characters')
      .regex(/[A-Z]/, 'Must include at least one uppercase letter')
      .regex(/[a-z]/, 'Must include at least one lowercase letter')
      .regex(/[0-9]/, 'Must include at least one number')
      .regex(/[^A-Za-z0-9]/, 'Must include at least one special symbol'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the editorial publishing terms' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export const RegisterPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setAuthUser } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const passwordVal = watch('password') || '';

  // Password strength calculation against registration policy
  const passwordStrength = useMemo(() => {
    let score = 0;
    if (passwordVal.length >= 10) score += 25;
    if (/[A-Z]/.test(passwordVal)) score += 25;
    if (/[a-z]/.test(passwordVal)) score += 25;
    if (/[0-9]/.test(passwordVal) || /[^A-Za-z0-9]/.test(passwordVal)) score += 25;

    let label = 'Weak';
    let color = 'bg-rose-500';
    if (score >= 100) {
      label = 'Strong';
      color = 'bg-emerald-500';
    } else if (score >= 75) {
      label = 'Moderate';
      color = 'bg-amber-500';
    } else if (score >= 50) {
      label = 'Fair';
      color = 'bg-amber-400';
    }

    return { score, label, color };
  }, [passwordVal]);

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      setAuthUser(response.user as any);
      // Route new user to topic onboarding to seed personalized feed
      navigate('/onboarding');
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage('An account with this email address already exists. Please sign in instead.');
      } else {
        setErrorMessage(
          err.response?.data?.message || 'An error occurred during registration. Please try again.',
        );
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
          Create an author account
        </h2>
        <p className="mt-1.5 text-xs text-ink-secondary">
          Join our community of independent journalists and writers
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-border-subtle rounded-xl sm:px-10">
          {errorMessage && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
              <AlertCircle size={17} className="text-rose-600 mt-0.5 shrink-0" />
              <p className="text-xs text-rose-700 font-medium">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                Full Name
              </label>
              <div className="mt-1.5 relative">
                <input
                  type="text"
                  {...register('name')}
                  placeholder="Adarsh Aldkar"
                  className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
                />
                <UserIcon size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name.message}</p>
              )}
            </div>

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
              <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="Min 10 chars, uppercase, number & symbol"
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

              {/* Password strength meter */}
              {passwordVal.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-ink-secondary mb-1">
                    <span>Password Strength:</span>
                    <span className="font-semibold text-ink-primary">{passwordStrength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                </div>
              )}

              {errors.password && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                Confirm Password
              </label>
              <div className="mt-1.5 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('confirmPassword')}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
                />
                <Shield size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start">
              <input
                id="agreeTerms"
                type="checkbox"
                {...register('agreeTerms')}
                className="mt-0.5 h-4 w-4 text-accent-crimson focus:ring-accent-crimson border-border-subtle rounded"
              />
              <label htmlFor="agreeTerms" className="ml-2 block text-xs text-ink-secondary leading-normal">
                I agree to the editorial standards, code of conduct, and terms of service.
              </label>
            </div>
            {errors.agreeTerms && (
              <p className="mt-0.5 text-xs text-rose-600 font-medium">{errors.agreeTerms.message}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border-subtle text-center">
            <p className="text-xs text-ink-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-crimson font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
