import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  RefreshCw,
  Sparkles,
  Layers,
  Flame,
  FileText,
} from 'lucide-react';
import {
  newsletterApi,
  type SubscriberStatus,
  type DigestFrequency,
  type NewsletterCampaign,
} from '../../api/newsletter.api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const TEMPLATES = [
  {
    name: 'Morning Dispatch Briefing',
    subject: 'The Gazette Daily Briefing: Key Developments',
    preview: 'Analysis of major breakthroughs, global policy, and software architecture.',
    html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px;">
    <h1 style="font-size: 28px; margin: 0; text-transform: uppercase; letter-spacing: 2px;">THE GAZETTE</h1>
    <p style="font-family: monospace; font-size: 11px; color: #64748b; margin: 4px 0 0 0;">MORNING DISPATCH &middot; VOLUME XXIV</p>
  </div>
  
  <h2 style="font-size: 20px; color: #0f172a; margin-top: 0;">Today's Lead Story</h2>
  <p style="font-size: 14px; color: #334155;">
    In this morning's edition, we explore emerging paradigms in distributed system architecture, real-time database mesh synchronization, and the latest editorial insights.
  </p>
  
  <div style="background-color: #f8fafc; border-left: 3px solid #b91c1c; padding: 12px 16px; margin: 20px 0;">
    <h3 style="font-size: 14px; margin: 0 0 4px 0; color: #0f172a;">Key Takeaway</h3>
    <p style="font-size: 13px; margin: 0; color: #475569;">
      High-reliability messaging guarantees zero lost updates while maintaining sub-millisecond reader response latencies.
    </p>
  </div>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; font-family: monospace; font-size: 11px; color: #94a3b8;">
    <p>Sent by The Gazette Editorial Desk &middot; <a href="#" style="color: #64748b;">Manage Preferences</a> &middot; <a href="#" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
  },
  {
    name: 'Breaking News Dispatch',
    subject: 'BREAKING: Urgent Editorial Update from The Gazette',
    preview: 'Urgent development regarding technology and governance.',
    html: `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
  <div style="border-bottom: 3px solid #b91c1c; padding-bottom: 12px; margin-bottom: 24px;">
    <span style="font-family: monospace; font-size: 11px; background-color: #b91c1c; color: white; padding: 2px 6px; font-weight: bold;">SPECIAL BULLETIN</span>
    <h1 style="font-size: 26px; margin: 8px 0 0 0;">THE GAZETTE SPECIAL DISPATCH</h1>
  </div>
  
  <p style="font-size: 15px; color: #0f172a; font-weight: bold;">
    An immediate briefing on breaking developments across the industry.
  </p>
  <p style="font-size: 14px; color: #334155;">
    Full investigative reporting is currently underway. Read continuous live coverage on The Gazette portal.
  </p>

  <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; font-family: monospace; font-size: 11px; color: #94a3b8;">
    <p>The Gazette Breaking News Service &middot; <a href="#" style="color: #64748b;">Manage Preferences</a> &middot; <a href="#" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
  },
];

export const NewsletterManagerPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'subscribers' | 'compose' | 'campaigns'>('compose');
  const [subStatusFilter, setSubStatusFilter] = useState<string>('ALL');
  const [subSearch, setSubSearch] = useState<string>('');
  const [subPage, setSubPage] = useState(1);

  // Compose State
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [previewText, setPreviewText] = useState(TEMPLATES[0].preview);
  const [contentHtml, setContentHtml] = useState(TEMPLATES[0].html);
  const [targetTopics, setTargetTopics] = useState<string[]>([]);
  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['adminNewsletterStats'],
    queryFn: async () => await newsletterApi.getStats(),
  });

  const { data: subscribersData, isLoading: isSubsLoading } = useQuery({
    queryKey: ['adminSubscribers', subStatusFilter, subSearch, subPage],
    queryFn: async () =>
      await newsletterApi.getSubscribers({
        status: subStatusFilter === 'ALL' ? undefined : (subStatusFilter as SubscriberStatus),
        search: subSearch.trim() || undefined,
        page: subPage,
        limit: 15,
      }),
  });

  const { data: campaignsData, refetch: refetchCampaigns } = useQuery({
    queryKey: ['adminCampaigns'],
    queryFn: async () => await newsletterApi.getCampaigns({ limit: 20 }),
  });

  // Mutations
  const createAndSendMutation = useMutation({
    mutationFn: async () => {
      // 1. Create campaign
      const camp = await newsletterApi.createCampaign({
        subject: subject.trim(),
        previewText: previewText.trim(),
        contentHtml,
        targetTopics: targetTopics.length > 0 ? targetTopics : undefined,
      });

      // 2. Trigger BullMQ batch distribution
      return await newsletterApi.sendCampaign(camp.id);
    },
    onSuccess: (res) => {
      setSendSuccessMsg(res.message);
      setShowConfirmSendModal(false);
      queryClient.invalidateQueries({ queryKey: ['adminNewsletterStats'] });
      queryClient.invalidateQueries({ queryKey: ['adminCampaigns'] });
      setActiveTab('campaigns');
      setTimeout(() => setSendSuccessMsg(null), 6000);
    },
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-ink-secondary">
            Audience &amp; Broadcast Operations
          </span>
          <h1 className="font-serif text-2xl font-bold text-ink-primary">
            Newsletter &amp; Campaign Center
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Manage subscriber double opt-in verification, capability-based suppression, and BullMQ broadcast dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchStats();
              refetchCampaigns();
            }}
            className="px-3 py-1.5 border border-border-subtle bg-white hover:bg-slate-50 text-ink-primary text-xs font-mono rounded flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* ── Metric Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 bg-white border border-border-subtle rounded space-y-1">
          <span className="text-[11px] font-mono text-ink-secondary uppercase">Total Subscribers</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-serif font-bold text-ink-primary">
              {statsData?.totalSubscribers || 0}
            </span>
          </div>
          <span className="text-[10px] text-ink-secondary block">All email records</span>
        </div>

        <div className="p-4 bg-white border border-emerald-200 bg-emerald-50/20 rounded space-y-1">
          <span className="text-[11px] font-mono text-emerald-800 uppercase flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Active &amp; Verified</span>
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-serif font-bold text-emerald-900">
              {statsData?.activeSubscribers || 0}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 block">Opted-in audience</span>
        </div>

        <div className="p-4 bg-white border border-border-subtle rounded space-y-1">
          <span className="text-[11px] font-mono text-amber-700 uppercase flex items-center gap-1">
            <Clock size={12} />
            <span>Pending Opt-In</span>
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-serif font-bold text-amber-800">
              {statsData?.pendingVerification || 0}
            </span>
          </div>
          <span className="text-[10px] text-ink-secondary block">Awaiting 48h click</span>
        </div>

        <div className="p-4 bg-white border border-border-subtle rounded space-y-1">
          <span className="text-[11px] font-mono text-rose-700 uppercase flex items-center gap-1">
            <Ban size={12} />
            <span>Suppressed / Bounced</span>
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-serif font-bold text-rose-800">
              {(statsData?.unsubscribed || 0) + (statsData?.bounced || 0)}
            </span>
          </div>
          <span className="text-[10px] text-ink-secondary block">Excluded from delivery</span>
        </div>

        <div className="p-4 bg-white border border-border-subtle rounded space-y-1">
          <span className="text-[11px] font-mono text-indigo-700 uppercase flex items-center gap-1">
            <Send size={12} />
            <span>Campaigns Sent</span>
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-serif font-bold text-indigo-900">
              {statsData?.totalCampaignsSent || 0}
            </span>
          </div>
          <span className="text-[10px] text-ink-secondary block">Completed dispatches</span>
        </div>
      </div>

      {/* Success Notification */}
      {sendSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono rounded flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} />
          <span>{sendSuccessMsg}</span>
        </div>
      )}

      {/* ── Navigation Tabs ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('compose')}
          className={`px-4 py-2 text-xs font-mono border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'compose'
              ? 'border-ink-primary text-ink-primary font-bold'
              : 'border-transparent text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <Flame size={13} />
          <span>Campaign Studio &amp; Composer</span>
        </button>

        <button
          onClick={() => setActiveTab('subscribers')}
          className={`px-4 py-2 text-xs font-mono border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'subscribers'
              ? 'border-ink-primary text-ink-primary font-bold'
              : 'border-transparent text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <Users size={13} />
          <span>Subscriber Directory ({statsData?.totalSubscribers || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 text-xs font-mono border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'campaigns'
              ? 'border-ink-primary text-ink-primary font-bold'
              : 'border-transparent text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <FileText size={13} />
          <span>Broadcast History</span>
        </button>
      </div>

      {/* ── TAB 1: COMPOSE & BROADCAST ────────────────────────────── */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Form: 7 cols */}
          <div className="lg:col-span-7 bg-white border border-border-subtle p-6 rounded space-y-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <span className="text-xs font-serif font-bold text-ink-primary">
                Compose Dispatch
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-ink-secondary">
                <span>Presets:</span>
                {TEMPLATES.map((tmpl, i) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => {
                      setSubject(tmpl.subject);
                      setPreviewText(tmpl.preview);
                      setContentHtml(tmpl.html);
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-ink-primary text-[10px] rounded"
                  >
                    Template {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-ink-secondary mb-1">
                  Subject Line *
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-border-subtle focus:outline-none focus:border-ink-primary font-serif font-bold"
                  placeholder="e.g. The Gazette Morning Briefing: Distributed Mesh Architecture"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-ink-secondary mb-1">
                  Preview Preheader Text (Optional)
                </label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-border-subtle focus:outline-none focus:border-ink-primary text-ink-secondary"
                  placeholder="Appears in email client inbox snippet..."
                />
              </div>

              {/* Topic Audience Filter */}
              <div>
                <label className="block text-[11px] font-mono text-ink-secondary mb-1">
                  Target Topic Filter (Empty = All Active Subscribers)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['technology', 'ai', 'software-architecture', 'policy-governance', 'editorial-design'].map(
                    (t) => {
                      const isSel = targetTopics.includes(t);
                      return (
                        <button
                          type="button"
                          key={t}
                          onClick={() => {
                            setTargetTopics((prev) =>
                              isSel ? prev.filter((x) => x !== t) : [...prev, t],
                            );
                          }}
                          className={`px-2.5 py-1 text-[10px] font-mono rounded transition-colors ${
                            isSel
                              ? 'bg-ink-primary text-white'
                              : 'bg-slate-100 text-ink-secondary hover:bg-slate-200'
                          }`}
                        >
                          {t}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>

              {/* HTML Content */}
              <div>
                <label className="block text-[11px] font-mono text-ink-secondary mb-1">
                  HTML Body Content *
                </label>
                <textarea
                  rows={12}
                  value={contentHtml}
                  onChange={(e) => setContentHtml(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-border-subtle bg-slate-900 text-emerald-400 focus:outline-none focus:border-ink-primary rounded"
                />
              </div>
            </div>

            {/* Audience estimate & Send Button */}
            <div className="border-t border-border-subtle pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-[11px] font-mono text-ink-secondary">
                Estimated Recipients:{' '}
                <span className="font-bold text-ink-primary">
                  {statsData?.activeSubscribers || 0} active
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmSendModal(true)}
                disabled={!subject.trim() || !contentHtml.trim() || (statsData?.activeSubscribers || 0) === 0}
                className="w-full sm:w-auto px-5 py-2 bg-accent-crimson hover:bg-rose-800 text-white text-xs font-semibold tracking-wide flex items-center justify-center gap-2 rounded transition-colors disabled:opacity-50"
              >
                <Send size={13} />
                <span>Launch Broadcast via BullMQ</span>
              </button>
            </div>
          </div>

          {/* Right Live Preview: 5 cols */}
          <div className="lg:col-span-5 bg-white border border-border-subtle p-6 rounded space-y-4">
            <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-ink-primary border-b border-border-subtle pb-3">
              <Eye size={14} className="text-indigo-600" />
              <span>Live Visual Preview</span>
            </div>

            <div className="border border-slate-200 rounded p-4 bg-slate-50 min-h-[400px] overflow-auto">
              <div className="bg-white border border-slate-200 shadow-sm p-4 rounded text-ink-primary">
                <div
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                  className="prose prose-sm max-w-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: SUBSCRIBERS DIRECTORY ─────────────────────────── */}
      {activeTab === 'subscribers' && (
        <div className="bg-white border border-border-subtle rounded p-4 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subscriber emails..."
                  value={subSearch}
                  onChange={(e) => {
                    setSubSearch(e.target.value);
                    setSubPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-border-subtle focus:outline-none focus:border-ink-primary font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'ACTIVE', 'PENDING_VERIFICATION', 'UNSUBSCRIBED', 'BOUNCED'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSubStatusFilter(st);
                    setSubPage(1);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded transition-colors whitespace-nowrap ${
                    subStatusFilter === st
                      ? 'bg-ink-primary text-white font-bold'
                      : 'bg-slate-100 text-ink-secondary hover:bg-slate-200'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Subscribers Table */}
          {isSubsLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : !subscribersData?.items || subscribersData.items.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-ink-secondary">
              No subscriber records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle font-mono text-[11px] text-ink-secondary bg-slate-50">
                    <th className="py-2.5 px-3">Subscriber Email</th>
                    <th className="py-2.5 px-3">Lifecycle Status</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Topics</th>
                    <th className="py-2.5 px-3">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {subscribersData.items.map((sub) => {
                    const isActive = sub.status === 'ACTIVE';
                    const isPending = sub.status === 'PENDING_VERIFICATION';
                    const isBounced = sub.status === 'BOUNCED';

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-ink-primary">
                          {sub.email}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded uppercase font-semibold ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isBounced
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sub.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-ink-secondary">
                          {sub.frequency}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {sub.topics.length === 0 ? (
                              <span className="text-[10px] font-mono text-slate-400">All Coverage</span>
                            ) : (
                              sub.topics.map((t) => (
                                <span
                                  key={t}
                                  className="px-1.5 py-0.5 bg-slate-100 text-ink-secondary text-[9px] font-mono rounded"
                                >
                                  {t}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-ink-secondary">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CAMPAIGN HISTORY ──────────────────────────────── */}
      {activeTab === 'campaigns' && (
        <div className="bg-white border border-border-subtle rounded p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <span className="text-xs font-serif font-bold text-ink-primary">
              Completed &amp; Scheduled Broadcasts
            </span>
          </div>

          {!campaignsData?.items || campaignsData.items.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-ink-secondary">
              No campaigns dispatched yet. Launch your first broadcast from the Studio tab.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle font-mono text-[11px] text-ink-secondary bg-slate-50">
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Recipients</th>
                    <th className="py-2.5 px-3">Delivered</th>
                    <th className="py-2.5 px-3">Failed</th>
                    <th className="py-2.5 px-3">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {campaignsData.items.map((camp) => (
                    <tr key={camp.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-3 font-serif font-bold text-ink-primary">
                        {camp.subject}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-mono rounded uppercase font-semibold ${
                            camp.status === 'SENT'
                              ? 'bg-emerald-100 text-emerald-800'
                              : camp.status === 'SENDING'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {camp.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono">{camp.totalRecipients}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-700 font-semibold">
                        {camp.deliveredCount}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-rose-700 font-semibold">
                        {camp.failedCount}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-ink-secondary">
                        {camp.sentAt ? new Date(camp.sentAt).toLocaleString() : 'Draft'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Confirm Broadcast Modal ───────────────────────────────── */}
      {showConfirmSendModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-border-subtle max-w-md w-full p-6 space-y-4 shadow-xl animate-scale-in">
            <div className="flex items-center gap-2 text-accent-crimson font-serif font-bold text-lg">
              <Send size={20} />
              <span>Confirm Broadcast Dispatch</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              You are about to dispatch <span className="font-semibold text-ink-primary">"{subject}"</span> to approximately <span className="font-bold text-ink-primary">{statsData?.activeSubscribers || 0} active subscribers</span> via BullMQ background queue batches.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSendModal(false)}
                className="px-4 py-2 text-xs font-mono border border-border-subtle hover:bg-slate-50 text-ink-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createAndSendMutation.mutate()}
                disabled={createAndSendMutation.isPending}
                className="px-4 py-2 text-xs font-mono bg-accent-crimson hover:bg-rose-800 text-white font-semibold"
              >
                {createAndSendMutation.isPending ? 'Enqueuing Batches...' : 'Confirm & Launch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
