import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { BrandLogo } from '../../components/common/BrandLogo';
import { authApi } from '../../api/auth.api';

const forgotSchema = z.object({
  email: z.email('Please enter a valid email address'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotFormData) => {
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(data.email);
    } catch {
      // Intentionally suppress error to maintain anti-enumeration standard
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-paper flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <BrandLogo size="lg" showSubtitle />
        <h2 className="mt-6 text-2xl font-editorial font-bold text-ink-primary">
          Reset your password
        </h2>
        <p className="mt-1.5 text-xs text-ink-secondary">
          Enter your email to receive a secure password reset link
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-border-subtle rounded-xl sm:px-10">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-editorial font-bold text-ink-primary">
                Instructions Dispatched
              </h3>
              <p className="mt-2 text-xs text-ink-secondary leading-relaxed">
                If an account is associated with this email address, you will receive password reset instructions shortly.
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-crimson hover:underline"
                >
                  <ArrowLeft size={14} />
                  <span>Return to login</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-ink-primary uppercase font-mono tracking-wider">
                  Email Address
                </label>
                <div className="mt-1.5 relative">
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="author@gazette.io"
                    className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all text-ink-primary"
                    autoFocus
                  />
                  <Mail size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-ink-secondary" />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? <span>Sending instructions...</span> : <span>Send Reset Link</span>}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-ink-primary transition-colors"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
