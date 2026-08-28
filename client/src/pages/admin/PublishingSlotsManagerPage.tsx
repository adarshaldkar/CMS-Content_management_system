import React, { useEffect, useState, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Trash2,
  Edit2,
  Users,
  Send,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  publishingSlotsApi,
  type PublishingSlot,
  type AuthorSlotAssignment,
  type QueuedSlotArticle,
  type CreatePublishingSlotDto,
  type AssignAuthorSlotDto,
} from '../../api/publishing-slots.api';
import { apiClient } from '../../api/client';
import { transitionArticleWorkflow } from '../../api/articles.api';
import { Skeleton } from '../../components/common/SkeletonLoader';

export const PublishingSlotsManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'slots' | 'queue' | 'authors'>('slots');
  const [slots, setSlots] = useState<PublishingSlot[]>([]);
  const [assignments, setAssignments] = useState<AuthorSlotAssignment[]>([]);
  const [queue, setQueue] = useState<QueuedSlotArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modals
  const [slotModalOpen, setSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<PublishingSlot | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  // Form states
  const [slotForm, setSlotForm] = useState<CreatePublishingSlotDto>({
    name: '',
    dispatchTime: '16:30:00',
    timezone: 'UTC',
    daysActive: 'ALL',
    maxArticlesPerSlot: 5,
    staggerMinutes: 5,
    isActive: true,
  });

  const [assignForm, setAssignForm] = useState<AssignAuthorSlotDto>({
    authorId: '',
    slotId: '',
    autoPublishEnabled: true,
    dailyQuota: 2,
  });

  const [availableUsers, setAvailableUsers] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [slotsData, assignData, queueData] = await Promise.all([
        publishingSlotsApi.getSlots(),
        publishingSlotsApi.getAssignments(),
        publishingSlotsApi.getUpcomingQueue(25),
      ]);
      setSlots(slotsData);
      setAssignments(assignData);
      setQueue(queueData);
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to load publishing slots telemetry.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsers = async () => {
    try {
      const res = await apiClient.get<{ items: Array<{ id: string; name: string; email: string; role: string }> }>('/users', {
        params: { limit: 100 },
      });
      setAvailableUsers(res.data.items || []);
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    loadData();
    loadUsers();
  }, [loadData]);

  // Handle Create / Update Slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      if (editingSlot) {
        await publishingSlotsApi.updateSlot(editingSlot.id, slotForm);
        setMessage({ type: 'success', text: `Slot "${slotForm.name}" updated successfully.` });
      } else {
        await publishingSlotsApi.createSlot(slotForm);
        setMessage({ type: 'success', text: `New publishing slot "${slotForm.name}" created.` });
      }
      setSlotModalOpen(false);
      setEditingSlot(null);
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to save publishing slot.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Delete Slot
  const handleDeleteSlot = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the slot "${name}"? All assigned authors will be disconnected.`)) return;
    try {
      setActionLoading(true);
      await publishingSlotsApi.deleteSlot(id);
      setMessage({ type: 'success', text: `Slot "${name}" deleted.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to delete slot.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Assign Author
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.authorId || !assignForm.slotId) {
      setMessage({ type: 'error', text: 'Please select both an author and a publishing slot.' });
      return;
    }
    try {
      setActionLoading(true);
      await publishingSlotsApi.assignAuthor(assignForm);
      setMessage({ type: 'success', text: 'Author successfully assigned to publishing slot with VIP auto-clearance!' });
      setAssignModalOpen(false);
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to assign author.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Revoke Author
  const handleRevokeAuthor = async (authorId: string, authorName: string) => {
    if (!window.confirm(`Revoke auto-publishing slot privileges for ${authorName}?`)) return;
    try {
      setActionLoading(true);
      await publishingSlotsApi.revokeAuthor(authorId);
      setMessage({ type: 'success', text: `Revoked slot privileges from ${authorName}.` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to revoke author assignment.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Instant Publish of Queued Article
  const handlePublishNow = async (articleId: string, title: string) => {
    if (!window.confirm(`Instantly publish "${title}" immediately, bypassing remaining slot timer?`)) return;
    try {
      setActionLoading(true);
      await transitionArticleWorkflow(articleId, { targetStatus: 'published' as any });
      setMessage({ type: 'success', text: `Article "${title}" published live immediately!` });
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.response?.data?.message || 'Failed to publish article.' });
    } finally {
      setActionLoading(false);
    }
  };

  const totalQueued = queue.length;
  const totalAuthors = assignments.length;

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent-crimson mb-1">
            <Zap size={14} className="text-amber-500 animate-pulse" />
            <span>Automated Editorial Operations</span>
          </div>
          <h1 className="font-serif text-3xl font-bold text-ink-primary tracking-tight">
            Author Publishing Slots & Auto-Dispatch
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Configure scheduled time-windows for trusted authors to auto-publish stories without manual review bottlenecks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingSlot(null);
              setSlotForm({
                name: '',
                dispatchTime: '16:30:00',
                timezone: 'UTC',
                daysActive: 'ALL',
                maxArticlesPerSlot: 5,
                staggerMinutes: 5,
                isActive: true,
              });
              setSlotModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus size={16} />
            <span>New Publishing Slot</span>
          </button>

          <button
            onClick={() => {
              setAssignForm({
                authorId: availableUsers[0]?.id || '',
                slotId: slots[0]?.id || '',
                autoPublishEnabled: true,
                dailyQuota: 2,
              });
              setAssignModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Sparkles size={16} />
            <span>Assign VIP Author</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading || actionLoading}
            className="p-2.5 border border-border-subtle hover:bg-slate-100 rounded-lg text-ink-secondary transition-colors"
            title="Refresh slot matrix"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Global Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-medium border animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-secondary">Configured Slots</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-serif font-bold text-ink-primary mt-2">{slots.length}</p>
          <p className="text-[11px] text-ink-secondary mt-1">Active time dispatch windows</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-secondary">VIP Slot Authors</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-serif font-bold text-ink-primary mt-2">{totalAuthors}</p>
          <p className="text-[11px] text-ink-secondary mt-1">Authors with auto-publish privilege</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-secondary">Queued in Pipeline</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Calendar size={18} />
            </div>
          </div>
          <p className="text-2xl font-serif font-bold text-amber-600 mt-2">{totalQueued}</p>
          <p className="text-[11px] text-ink-secondary mt-1">Stories awaiting auto-dispatch</p>
        </div>

        <div className="bg-white border border-border-subtle rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-secondary">Engine Status</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Zap size={18} />
            </div>
          </div>
          <p className="text-xs font-semibold text-emerald-700 mt-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            CRON SCHEDULER ACTIVE
          </p>
          <p className="text-[11px] text-ink-secondary mt-1">60-second atomic sweep interval</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border-subtle flex items-center gap-8 text-xs font-medium">
        <button
          onClick={() => setActiveTab('slots')}
          className={`pb-3.5 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'slots'
              ? 'border-ink-primary text-ink-primary font-semibold'
              : 'border-transparent text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <Clock size={15} />
          <span>Publishing Slots ({slots.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3.5 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-ink-primary text-ink-primary font-semibold'
              : 'border-transparent text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <Send size={15} />
          <span>Scheduled Queue ({queue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('authors')}
          className={`pb-3.5 transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'authors'
              ? 'border-ink-primary text-ink-primary font-semibold'
              : 'border-transparent text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <Users size={15} />
          <span>VIP Author Clearances ({assignments.length})</span>
        </button>
      </div>

      {/* TAB 1: SLOTS MATRIX */}
      {activeTab === 'slots' && (
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-44 rounded-xl" />
              <Skeleton className="h-44 rounded-xl" />
            </div>
          ) : slots.length === 0 ? (
            <div className="bg-white border border-border-subtle rounded-xl p-12 text-center">
              <Clock size={36} className="mx-auto text-slate-300 mb-3" />
              <h3 className="font-serif text-lg font-bold text-ink-primary">No Publishing Slots Defined</h3>
              <p className="text-xs text-ink-secondary mt-1 max-w-md mx-auto">
                Create your first automated slot (e.g. "Evening 4:30 PM Release") to start auto-dispatching verified stories.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className={`bg-white border rounded-xl p-5 transition-all shadow-xs flex flex-col justify-between ${
                    slot.isActive ? 'border-border-subtle hover:border-slate-400' : 'border-slate-200 bg-slate-50 opacity-75'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2.5 py-1 bg-slate-900 text-white rounded-md text-xs font-mono font-bold tracking-wider">
                          {slot.dispatchTime.slice(0, 5)} {slot.timezone}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                            slot.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {slot.isActive ? 'Active' : 'Paused'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingSlot(slot);
                            setSlotForm({
                              name: slot.name,
                              dispatchTime: slot.dispatchTime,
                              timezone: slot.timezone,
                              daysActive: slot.daysActive,
                              maxArticlesPerSlot: slot.maxArticlesPerSlot,
                              staggerMinutes: slot.staggerMinutes,
                              isActive: slot.isActive,
                            });
                            setSlotModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit slot"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot.id, slot.name)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete slot"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-serif text-lg font-bold text-ink-primary mt-3">{slot.name}</h3>
                    <p className="text-xs text-ink-secondary mt-0.5">Slug: <code className="font-mono text-slate-600">{slot.slug}</code></p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border-subtle grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-[10px] text-ink-secondary font-medium">Assigned Authors</span>
                      <span className="font-bold text-ink-primary mt-0.5 block">{slot.assignedAuthorCount || 0}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-[10px] text-ink-secondary font-medium">Queued Stories</span>
                      <span className="font-bold text-amber-600 mt-0.5 block">{slot.queuedCount || 0}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <span className="block text-[10px] text-ink-secondary font-medium">Stagger Spacing</span>
                      <span className="font-bold text-ink-primary mt-0.5 block">+{slot.staggerMinutes || 5} min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SCHEDULED QUEUE PIPELINE */}
      {activeTab === 'queue' && (
        <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
              Upcoming Auto-Dispatch Stories Pipeline
            </h3>
            <span className="text-xs text-ink-secondary font-medium">
              {queue.length} articles waiting in scheduled queues
            </span>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : queue.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 size={36} className="mx-auto text-emerald-400 mb-3" />
              <h4 className="font-serif text-base font-bold text-ink-primary">Queue is Clear</h4>
              <p className="text-xs text-ink-secondary mt-1">
                No articles are currently queued in scheduled publishing slots.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {queue.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 bg-amber-50 text-amber-700 rounded-lg shrink-0">
                      <Clock size={16} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-ink-primary truncate hover:text-accent-crimson transition-colors">
                        {item.title}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-ink-secondary mt-1">
                        <span>Author: <strong className="text-ink-primary">{item.author_name}</strong></span>
                        <span>•</span>
                        <span>Slot: <strong className="text-slate-800">{item.slot_name || 'Standard Schedule'}</strong></span>
                        <span>•</span>
                        <span className="text-amber-700 font-medium font-mono">
                          Target: {item.scheduled_at ? new Date(item.scheduled_at).toLocaleString() : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePublishNow(item.id, item.title)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
                      title="Publish immediately"
                    >
                      <Zap size={13} />
                      <span>Publish Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VIP AUTHOR CLEARANCES */}
      {activeTab === 'authors' && (
        <div className="bg-white border border-border-subtle rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-primary">
              Authors Granted Automated Publishing Privileges
            </h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search author by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-border-subtle rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-400 w-56"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={36} className="mx-auto text-slate-300 mb-3" />
              <h4 className="font-serif text-base font-bold text-ink-primary">No VIP Authors Assigned</h4>
              <p className="text-xs text-ink-secondary mt-1">
                Assign an author to a publishing slot above to grant them automated zero-review publishing clearance.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {assignments
                .filter((a) => !searchQuery || (a.authorName?.toLowerCase().includes(searchQuery.toLowerCase()) || a.authorEmail?.toLowerCase().includes(searchQuery.toLowerCase())))
                .map((a) => (
                  <div key={a.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 overflow-hidden shrink-0">
                        {a.authorAvatar ? <img src={a.authorAvatar} alt={a.authorName} className="w-full h-full object-cover" /> : a.authorName?.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-ink-primary">{a.authorName}</h4>
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[10px] font-semibold">
                            VIP CLEARANCE
                          </span>
                        </div>
                        <p className="text-[11px] text-ink-secondary mt-0.5">{a.authorEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-right hidden sm:block">
                        <span className="block text-[11px] text-ink-secondary">Assigned Slot</span>
                        <strong className="text-ink-primary">{a.slotName} ({a.slotDispatchTime?.slice(0, 5)})</strong>
                      </div>

                      <div className="text-right hidden sm:block">
                        <span className="block text-[11px] text-ink-secondary">Daily Quota</span>
                        <strong className="text-ink-primary">{a.dailyQuota} stories/day</strong>
                      </div>

                      <button
                        onClick={() => handleRevokeAuthor(a.authorId, a.authorName || 'Author')}
                        className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        Revoke Slot
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT SLOT MODAL */}
      {slotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border-subtle animate-scaleIn">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
              <h3 className="font-serif text-lg font-bold text-ink-primary">
                {editingSlot ? 'Edit Publishing Slot' : 'Create New Publishing Slot'}
              </h3>
              <button onClick={() => setSlotModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-primary mb-1">Slot Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prime Evening Editorial Digest"
                  value={slotForm.name}
                  onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-primary mb-1">Dispatch Time (24h)</label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={slotForm.dispatchTime.slice(0, 8)}
                    onChange={(e) => setSlotForm({ ...slotForm, dispatchTime: e.target.value + (e.target.value.length === 5 ? ':00' : '') })}
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-primary mb-1">Timezone</label>
                  <select
                    value={slotForm.timezone}
                    onChange={(e) => setSlotForm({ ...slotForm, timezone: e.target.value })}
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
                  >
                    <option value="UTC">UTC (Universal)</option>
                    <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
                    <option value="America/New_York">EST (New York)</option>
                    <option value="Europe/London">GMT (London)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-ink-primary mb-1">Max Queue Size</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={slotForm.maxArticlesPerSlot}
                    onChange={(e) => setSlotForm({ ...slotForm, maxArticlesPerSlot: parseInt(e.target.value, 10) || 5 })}
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-ink-primary mb-1">Stagger Spacing (Minutes)</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={slotForm.staggerMinutes}
                    onChange={(e) => setSlotForm({ ...slotForm, staggerMinutes: parseInt(e.target.value, 10) || 5 })}
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={slotForm.isActive}
                  onChange={(e) => setSlotForm({ ...slotForm, isActive: e.target.checked })}
                  className="rounded text-slate-900 focus:ring-slate-400"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-ink-primary cursor-pointer">
                  Slot is Active & Ready for Auto-Dispatch
                </label>
              </div>

              <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSlotModalOpen(false)}
                  className="px-4 py-2 border border-border-subtle text-ink-secondary hover:bg-slate-50 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold"
                >
                  {editingSlot ? 'Update Slot' : 'Create Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN AUTHOR TO SLOT MODAL */}
      {assignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-border-subtle animate-scaleIn">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
              <h3 className="font-serif text-lg font-bold text-ink-primary">
                Assign Author to Automated Publishing Slot
              </h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink-primary mb-1">Select Author</label>
                <select
                  required
                  value={assignForm.authorId}
                  onChange={(e) => setAssignForm({ ...assignForm, authorId: e.target.value })}
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
                >
                  <option value="">-- Choose an author --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — [{u.role}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-primary mb-1">Select Publishing Slot</label>
                <select
                  required
                  value={assignForm.slotId}
                  onChange={(e) => setAssignForm({ ...assignForm, slotId: e.target.value })}
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
                >
                  <option value="">-- Choose a slot --</option>
                  {slots.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} @ {s.dispatchTime.slice(0, 5)} {s.timezone}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-ink-primary mb-1">Daily Auto-Publish Quota</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={assignForm.dailyQuota}
                  onChange={(e) => setAssignForm({ ...assignForm, dailyQuota: parseInt(e.target.value, 10) || 2 })}
                  className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-xs"
                />
                <span className="text-[11px] text-ink-secondary mt-1 block">
                  Prevents quota exhaustion and spamming within the same 24-hour cycle.
                </span>
              </div>

              <div className="pt-4 border-t border-border-subtle flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssignModalOpen(false)}
                  className="px-4 py-2 border border-border-subtle text-ink-secondary hover:bg-slate-50 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>Grant VIP Slot Clearance</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default PublishingSlotsManagerPage;
