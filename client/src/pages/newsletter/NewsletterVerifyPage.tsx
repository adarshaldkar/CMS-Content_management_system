import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Mail, Sparkles } from 'lucide-react';
import { newsletterApi } from '../../api/newsletter.api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const NewsletterVerifyPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['newsletterVerify', token],
    queryFn: async () => {
      if (!token) throw new Error('No verification token provided');
      return await newsletterApi.verify(token);
    },
    retry: false,
  });

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white border border-border-subtle p-8 sm:p-10 shadow-sm text-center space-y-6">
        {isLoading && (
          <div className="py-12 space-y-4">
            <LoadingSpinner size="lg" label="Verifying subscription capability with cryptographic hash..." />
          </div>
        )}

        {isError && (
          <div className="space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
              <AlertCircle size={24} />
            </div>
            <h1 className="font-serif text-2xl font-bold text-ink-primary">
              Verification Failed
            </h1>
            <p className="text-xs text-ink-secondary leading-relaxed max-w-sm mx-auto">
              {(error as any)?.response?.data?.message ||
                'This verification link is invalid or has expired (48h TTL). Please resubscribe on our homepage to receive a fresh verification link.'}
            </p>
            <div className="pt-4">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors"
              >
                <span>Return to The Gazette</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-5 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
              <CheckCircle2 size={30} />
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-800 font-bold">
                Double Opt-In Confirmed
              </span>
              <h1 className="font-serif text-3xl font-bold text-ink-primary mt-1">
                Subscription Activated
              </h1>
              <p className="text-xs text-ink-secondary mt-2">
                Your email <span className="font-semibold text-ink-primary">{data.subscriber.email}</span> is now active for the Morning Dispatch.
              </p>
            </div>

            <div className="bg-slate-50 border border-border-subtle p-4 rounded text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-ink-secondary font-mono text-[11px]">
                <span>Delivery Cadence:</span>
                <span className="font-bold text-ink-primary uppercase">{data.subscriber.frequency}</span>
              </div>
              <div className="flex items-center justify-between text-ink-secondary font-mono text-[11px]">
                <span>Status:</span>
                <span className="font-bold text-emerald-700">ACTIVE &amp; VERIFIED</span>
              </div>
              {data.subscriber.topics.length > 0 && (
                <div className="pt-2 border-t border-border-subtle">
                  <span className="block text-[11px] font-mono text-ink-secondary mb-1.5">
                    Selected Topics:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {data.subscriber.topics.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 bg-white border border-border-subtle text-[10px] font-mono text-ink-primary rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors"
              >
                <span>Read Today's Stories</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
