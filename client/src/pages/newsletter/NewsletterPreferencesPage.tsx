import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sliders,
  Check,
  Ban,
} from 'lucide-react';
import {
  newsletterApi,
  type DigestFrequency,
  type SubscriberStatus,
} from '../../api/newsletter.api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const TOPIC_OPTIONS = [
  { id: 'technology', label: 'Technology & Computing' },
  { id: 'ai', label: 'Artificial Intelligence & ML' },
  { id: 'software-architecture', label: 'Software Architecture' },
  { id: 'editorial-design', label: 'Editorial Design & Media' },
  { id: 'policy-governance', label: 'Policy & Governance' },
  { id: 'science', label: 'Science & Discovery' },
];

export const NewsletterPreferencesPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<DigestFrequency>('DAILY');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [confirmUnsubModal, setConfirmUnsubModal] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['newsletterPreferences', token],
    queryFn: async () => {
      if (!token) throw new Error('Capability token required');
      return await newsletterApi.getPreferences(token);
    },
    retry: false,
  });

  useEffect(() => {
    if (data) {
      setSelectedTopics(data.topics || []);
      setFrequency(data.frequency || 'DAILY');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      topics?: string[];
      frequency?: DigestFrequency;
      unsubscribeAll?: boolean;
    }) => {
      if (!token) throw new Error('Token required');
      return await newsletterApi.updatePreferences(token, payload);
    },
    onSuccess: (res) => {
      setSaveSuccessMsg(res.message);
      queryClient.invalidateQueries({ queryKey: ['newsletterPreferences', token] });
      setConfirmUnsubModal(false);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white border border-border-subtle p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-600">
            <AlertTriangle size={24} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-ink-primary">
            Preference Link Invalid
          </h1>
          <p className="text-xs text-ink-secondary leading-relaxed">
            {(error as any)?.response?.data?.message ||
              'This unsubscribe or preference link is invalid or has expired. Please check the link from your latest email.'}
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink-primary text-white text-xs font-semibold rounded"
            >
              <span>The Gazette Homepage</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isUnsubscribed = data.status === 'UNSUBSCRIBED';

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="bg-white border border-border-subtle p-6 sm:p-10 shadow-sm space-y-8">
        {/* Header */}
        <div className="border-b border-border-subtle pb-6 space-y-2">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-accent-crimson" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-ink-primary font-bold">
              Reader Preference Center
            </span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink-primary">
            Newsletter &amp; Dispatch Settings
          </h1>
          <p className="text-xs text-ink-secondary">
            Managing settings for <span className="font-semibold text-ink-primary">{data.email}</span>
          </p>
        </div>

        {/* Status Indicator */}
        <div
          className={`p-4 rounded border text-xs flex items-center justify-between ${
            isUnsubscribed
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {isUnsubscribed ? <Ban size={16} /> : <CheckCircle2 size={16} />}
            <div>
              <span className="font-bold font-mono uppercase text-[11px] block">
                Subscription Status: {data.status}
              </span>
              <span className="text-[11px]">
                {isUnsubscribed
                  ? 'You are currently opted out from all automated dispatches.'
                  : 'You are receiving verified Morning Dispatch briefings.'}
              </span>
            </div>
          </div>
        </div>

        {/* Success toast */}
        {saveSuccessMsg && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-mono rounded flex items-center gap-2 animate-fade-in">
            <Check size={14} />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Topics Selection */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-bold text-ink-primary">
            1. Desired Coverage Topics
          </h2>
          <p className="text-xs text-ink-secondary">
            Select the categories you want featured in your briefing. Leave all unchecked to receive our full editorial scope.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            {TOPIC_OPTIONS.map((t) => {
              const isChecked = selectedTopics.includes(t.id);
              return (
                <label
                  key={t.id}
                  className={`flex items-center gap-3 p-3 border rounded text-xs cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-ink-primary bg-slate-50 text-ink-primary font-medium'
                      : 'border-border-subtle bg-white text-ink-secondary hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTopics((prev) => [...prev, t.id]);
                      } else {
                        setSelectedTopics((prev) => prev.filter((x) => x !== t.id));
                      }
                    }}
                    className="w-4 h-4 text-ink-primary border-slate-300 rounded focus:ring-0"
                  />
                  <span>{t.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Frequency Selection */}
        <div className="space-y-4 border-t border-border-subtle pt-6">
          <h2 className="font-serif text-lg font-bold text-ink-primary">
            2. Delivery Cadence
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'DAILY' as DigestFrequency, label: 'Daily Briefing', desc: 'Every morning at 07:00 UTC' },
              { id: 'WEEKLY' as DigestFrequency, label: 'Weekly Digest', desc: 'Saturday summary edition' },
              { id: 'INSTANT' as DigestFrequency, label: 'Instant Alerts', desc: 'As breaking stories publish' },
            ].map((f) => {
              const isSelected = frequency === f.id;
              return (
                <div
                  key={f.id}
                  onClick={() => setFrequency(f.id)}
                  className={`p-3.5 border rounded cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-ink-primary bg-slate-50 text-ink-primary'
                      : 'border-border-subtle bg-white text-ink-secondary hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-serif font-bold text-xs">{f.label}</span>
                    {isSelected && <Check size={12} className="text-ink-primary" />}
                  </div>
                  <p className="text-[11px] text-ink-secondary">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-border-subtle pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={() =>
              updateMutation.mutate({
                topics: selectedTopics,
                frequency,
                unsubscribeAll: false,
              })
            }
            disabled={updateMutation.isPending}
            className="w-full sm:w-auto px-6 py-2.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving Preferences...' : 'Save Preferences'}
          </button>

          <button
            type="button"
            onClick={() => setConfirmUnsubModal(true)}
            className="text-xs font-mono text-rose-700 hover:text-rose-900 underline"
          >
            Unsubscribe from all emails
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmUnsubModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle max-w-md w-full p-6 space-y-4 shadow-xl animate-scale-in">
            <div className="flex items-center gap-2 text-rose-600 font-serif font-bold text-lg">
              <AlertTriangle size={20} />
              <span>Confirm Unsubscribe</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Are you sure you want to unsubscribe <span className="font-semibold text-ink-primary">{data.email}</span> from all Gazette briefings? You can reactivate your subscription at any time.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmUnsubModal(false)}
                className="px-4 py-2 text-xs font-mono border border-border-subtle hover:bg-slate-50 text-ink-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateMutation.mutate({ unsubscribeAll: true })}
                disabled={updateMutation.isPending}
                className="px-4 py-2 text-xs font-mono bg-rose-600 hover:bg-rose-700 text-white font-medium"
              >
                {updateMutation.isPending ? 'Unsubscribing...' : 'Yes, Unsubscribe Me'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
