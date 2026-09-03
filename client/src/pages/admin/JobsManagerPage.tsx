import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import NumberFlow from '@number-flow/react';
import { jobsApi, type QueueSummary, type JobDetail } from '../../api/jobs.api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

const QUEUE_DISPLAY_NAMES: Record<string, { label: string; desc: string }> = {
  'scheduled-publishing': {
    label: 'Scheduled Publishing',
    desc: 'Delayed release of scheduled articles and automated slot promotions.',
  },
  'notification-outbox': {
    label: 'Notification Outbox',
    desc: 'Asynchronous in-app notifications, Web Push signals, and email dispatches.',
  },
  'mesh-reconciliation': {
    label: 'Mesh Reconciliation',
    desc: 'Secondary transactional mutation replays for MariaDB, MySQL, and CockroachDB.',
  },
  'analytics-rollup': {
    label: 'Analytics Rollup',
    desc: 'ClickHouse columnar metrics aggregation and hourly engagement rollups.',
  },
};

export const JobsManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedQueue, setSelectedQueue] = useState<string>('scheduled-publishing');
  const [selectedState, setSelectedState] = useState<
    'failed' | 'delayed' | 'active' | 'waiting' | 'completed'
  >('failed');
  const [page, setPage] = useState<number>(1);
  const [inspectJobId, setInspectJobId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Queue Summaries
  const {
    data: queues = [],
    isLoading: isLoadingQueues,
    refetch: refetchQueues,
    isRefetching: isRefetchingQueues,
  } = useQuery({
    queryKey: ['adminQueues'],
    queryFn: () => jobsApi.getQueues(),
    refetchInterval: 5000,
  });

  // 2. Fetch Jobs for Selected Queue & State
  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
    isRefetching: isRefetchingJobs,
  } = useQuery({
    queryKey: ['adminQueueJobs', selectedQueue, selectedState, page],
    queryFn: () => jobsApi.getJobs(selectedQueue, selectedState, page, 15),
    refetchInterval: 5000,
  });

  // 3. Fetch Single Job Detail for Inspection Modal
  const { data: jobDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['adminJobDetail', selectedQueue, inspectJobId],
    queryFn: () => (inspectJobId ? jobsApi.getJobDetail(selectedQueue, inspectJobId) : null),
    enabled: Boolean(inspectJobId),
  });

  // 4. Mutations
  const retrySingleMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.retryJob(selectedQueue, jobId),
    onSuccess: (data) => {
      setActionSuccess(`Job [${data.jobId}] re-enqueued successfully.`);
      queryClient.invalidateQueries({ queryKey: ['adminQueues'] });
      queryClient.invalidateQueries({ queryKey: ['adminQueueJobs'] });
      setInspectJobId(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to retry job.');
    },
  });

  const retryAllMutation = useMutation({
    mutationFn: () => jobsApi.retryAllFailed(selectedQueue),
    onSuccess: (data) => {
      setActionSuccess(`Bulk retried ${data.count} failed jobs in queue.`);
      queryClient.invalidateQueries({ queryKey: ['adminQueues'] });
      queryClient.invalidateQueries({ queryKey: ['adminQueueJobs'] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to bulk retry jobs.');
    },
  });

  const removeJobMutation = useMutation({
    mutationFn: (jobId: string) => jobsApi.removeJob(selectedQueue, jobId),
    onSuccess: () => {
      setActionSuccess('Job removed permanently.');
      queryClient.invalidateQueries({ queryKey: ['adminQueues'] });
      queryClient.invalidateQueries({ queryKey: ['adminQueueJobs'] });
      setInspectJobId(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to delete job.');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: (queueName: string) => jobsApi.pauseQueue(queueName),
    onSuccess: () => {
      setActionSuccess(`Queue paused.`);
      queryClient.invalidateQueries({ queryKey: ['adminQueues'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: (queueName: string) => jobsApi.resumeQueue(queueName),
    onSuccess: () => {
      setActionSuccess(`Queue resumed.`);
      queryClient.invalidateQueries({ queryKey: ['adminQueues'] });
    },
  });

  const cleanMutation = useMutation({
    mutationFn: (status: 'completed' | 'failed') =>
      jobsApi.cleanQueue(selectedQueue, { gracePeriodMs: 0, status }),
    onSuccess: (data) => {
      setActionSuccess(`Purged ${data.removedCount} jobs.`);
      queryClient.invalidateQueries({ queryKey: ['adminQueues'] });
      queryClient.invalidateQueries({ queryKey: ['adminQueueJobs'] });
    },
  });

  const dispatchTestMutation = useMutation({
    mutationFn: (type: 'delayed' | 'simulate-dlq' | 'immediate') =>
      jobsApi.dispatchTestJob(selectedQueue, type),
    onSuccess: (data) => {
      setActionSuccess(`Dispatched sample ${data.type} job [${data.jobId}]. Telemetry updated.`);
      queryClient.invalidateQueries({ queryKey: ['adminQueues'] });
      queryClient.invalidateQueries({ queryKey: ['adminQueueJobs'] });
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.message || err.message || 'Failed to dispatch test job.');
    },
  });

  const currentQueueSummary = queues.find((q) => q.queueName === selectedQueue);

  // Overall Cluster Totals
  const totalActive = queues.reduce((sum, q) => sum + (q.counts?.active || 0), 0);
  const totalWaiting = queues.reduce((sum, q) => sum + (q.counts?.waiting || 0), 0);
  const totalDelayed = queues.reduce((sum, q) => sum + (q.counts?.delayed || 0), 0);
  const totalFailed = queues.reduce((sum, q) => sum + (q.counts?.failed || 0), 0);
  const totalCompleted = queues.reduce((sum, q) => sum + (q.counts?.completed || 0), 0);

  const formatMs = (ms?: number) => {
    if (!ms || ms <= 0) return '0s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const formatDate = (ts?: number | null) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* ── Editorial Header ────────────────────────────────────────── */}
      <div className="border-b-2 border-ink-primary pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <Cpu size={14} />
            <span>Infrastructure Governance</span>
          </div>
          <h1 className="text-3xl font-editorial font-bold text-ink-primary tracking-tight">
            Background Jobs &amp; DLQ Console
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Real-time BullMQ queue telemetry, Dead-Letter Queue (DLQ) diagnostic inspection, and recovery operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              refetchQueues();
              refetchJobs();
            }}
            disabled={isRefetchingQueues || isRefetchingJobs}
            className="px-3.5 py-2 border border-border-subtle bg-white text-ink-primary hover:bg-slate-50 text-xs font-mono rounded flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={13}
              className={isRefetchingQueues || isRefetchingJobs ? 'animate-spin' : ''}
            />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* ── Banner Alerts ────────────────────────────────────────── */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X size={14} />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Cluster-Wide Queue Telemetry Cards ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Active Workers */}
        <div className="p-4 bg-white border border-border-subtle rounded flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Active Jobs</span>
            <Zap size={14} className="text-amber-500" />
          </div>
          <div className="text-2xl font-editorial font-bold text-ink-primary">
            <NumberFlow value={totalActive} />
          </div>
          <span className="text-[10px] font-mono text-ink-secondary mt-1">Currently in execution</span>
        </div>

        {/* Waiting Backlog */}
        <div className="p-4 bg-white border border-border-subtle rounded flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Waiting</span>
            <Clock size={14} className="text-sky-500" />
          </div>
          <div className="text-2xl font-editorial font-bold text-ink-primary">
            <NumberFlow value={totalWaiting} />
          </div>
          <span className="text-[10px] font-mono text-ink-secondary mt-1">In worker queues</span>
        </div>

        {/* Delayed Scheduled */}
        <div className="p-4 bg-white border border-border-subtle rounded flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Delayed</span>
            <Layers size={14} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-editorial font-bold text-ink-primary">
            <NumberFlow value={totalDelayed} />
          </div>
          <span className="text-[10px] font-mono text-ink-secondary mt-1">Scheduled releases</span>
        </div>

        {/* Dead-Letter Queue (DLQ) */}
        <div
          className={`p-4 border rounded flex flex-col justify-between ${
            totalFailed > 0 ? 'bg-rose-50/60 border-rose-300' : 'bg-white border-border-subtle'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                totalFailed > 0 ? 'text-rose-700' : 'text-ink-secondary'
              }`}
            >
              Dead-Letter (DLQ)
            </span>
            <ShieldAlert size={14} className={totalFailed > 0 ? 'text-rose-600' : 'text-slate-400'} />
          </div>
          <div
            className={`text-2xl font-editorial font-bold ${
              totalFailed > 0 ? 'text-rose-700' : 'text-ink-primary'
            }`}
          >
            <NumberFlow value={totalFailed} />
          </div>
          <span
            className={`text-[10px] font-mono mt-1 ${
              totalFailed > 0 ? 'text-rose-600 font-semibold' : 'text-ink-secondary'
            }`}
          >
            {totalFailed > 0 ? 'Requires DLQ triage' : 'Zero failed items'}
          </span>
        </div>

        {/* Completed */}
        <div className="p-4 bg-white border border-border-subtle rounded flex flex-col justify-between">
          <div className="flex items-center justify-between text-ink-secondary mb-2">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">Completed</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-editorial font-bold text-ink-primary">
            <NumberFlow value={totalCompleted} />
          </div>
          <span className="text-[10px] font-mono text-ink-secondary mt-1">Successful dispatches</span>
        </div>
      </div>

      {/* ── Queue Selection Tabs ──────────────────────────────────── */}
      <div className="border-b border-border-subtle flex flex-wrap gap-2">
        {queues.map((q) => {
          const isSelected = selectedQueue === q.queueName;
          const info = QUEUE_DISPLAY_NAMES[q.queueName] || {
            label: q.queueName,
            desc: '',
          };
          const hasFailures = (q.counts?.failed || 0) > 0;

          return (
            <button
              key={q.queueName}
              onClick={() => {
                setSelectedQueue(q.queueName);
                setPage(1);
              }}
              className={`pb-3 px-4 text-xs font-mono flex items-center gap-2 border-b-2 transition-all ${
                isSelected
                  ? 'border-ink-primary text-ink-primary font-bold'
                  : 'border-transparent text-ink-secondary hover:text-ink-primary'
              }`}
            >
              <span>{info.label}</span>
              {hasFailures && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-full">
                  {q.counts.failed}
                </span>
              )}
              {q.isPaused && (
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold">
                  PAUSED
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Current Selected Queue Bar & Actions ──────────────────── */}
      {currentQueueSummary && (
        <div className="p-4 bg-canvas-paper border border-border-subtle rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-editorial text-ink-primary">
                {QUEUE_DISPLAY_NAMES[currentQueueSummary.queueName]?.label || currentQueueSummary.queueName}
              </span>
              <span className="text-xs font-mono text-ink-secondary">
                ({currentQueueSummary.workersCount} active workers)
              </span>
            </div>
            <p className="text-xs text-ink-secondary">
              {QUEUE_DISPLAY_NAMES[currentQueueSummary.queueName]?.desc}
            </p>
            {currentQueueSummary.metrics.oldestWaitingJobAgeMs > 0 && (
              <div className="text-[11px] font-mono text-amber-700 font-medium">
                Oldest waiting job age: {formatMs(currentQueueSummary.metrics.oldestWaitingJobAgeMs)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Dispatch Sample Delayed Job Button */}
            <button
              onClick={() => dispatchTestMutation.mutate('delayed')}
              disabled={dispatchTestMutation.isPending}
              className="px-3 py-1.5 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-mono rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Enqueue sample job with 2-minute delay"
            >
              <Clock size={12} />
              <span>+ Enqueue Delayed Job (+2m)</span>
            </button>

            {/* Simulate DLQ Failure Button */}
            <button
              onClick={() => dispatchTestMutation.mutate('simulate-dlq')}
              disabled={dispatchTestMutation.isPending}
              className="px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-mono rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Enqueue simulated task for Dead-Letter testing"
            >
              <AlertTriangle size={12} />
              <span>+ Simulate DLQ Task</span>
            </button>

            {/* Pause / Resume Button */}
            {currentQueueSummary.isPaused ? (
              <button
                onClick={() => resumeMutation.mutate(currentQueueSummary.queueName)}
                disabled={resumeMutation.isPending}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono rounded flex items-center gap-1.5 transition-colors"
              >
                <Play size={12} />
                <span>Resume Queue</span>
              </button>
            ) : (
              <button
                onClick={() => pauseMutation.mutate(currentQueueSummary.queueName)}
                disabled={pauseMutation.isPending}
                className="px-3 py-1.5 border border-border-subtle bg-white hover:bg-slate-50 text-ink-primary text-xs font-mono rounded flex items-center gap-1.5 transition-colors"
              >
                <Pause size={12} />
                <span>Pause Queue</span>
              </button>
            )}

            {/* Bulk Retry All Failed */}
            {(currentQueueSummary.counts.failed || 0) > 0 && (
              <button
                onClick={() => retryAllMutation.mutate()}
                disabled={retryAllMutation.isPending}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono rounded flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw size={12} />
                <span>Retry All DLQ ({currentQueueSummary.counts.failed})</span>
              </button>
            )}

            {/* Clean Completed */}
            <button
              onClick={() => cleanMutation.mutate('completed')}
              disabled={cleanMutation.isPending}
              className="px-2.5 py-1.5 border border-border-subtle bg-white hover:bg-slate-50 text-ink-secondary hover:text-ink-primary text-xs font-mono rounded flex items-center gap-1 transition-colors"
              title="Purge completed jobs to reclaim memory"
            >
              <Trash2 size={12} />
              <span>Purge Completed</span>
            </button>
          </div>
        </div>
      )}

      {/* ── State Filter Tabs & Table ─────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-subtle pb-2">
          {(['failed', 'delayed', 'active', 'waiting', 'completed'] as const).map((st) => {
            const count = currentQueueSummary?.counts[st] || 0;
            const isSelected = selectedState === st;
            return (
              <button
                key={st}
                onClick={() => {
                  setSelectedState(st);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
                  isSelected
                    ? st === 'failed'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'bg-ink-primary text-white font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-ink-secondary'
                }`}
              >
                <span className="capitalize">{st === 'failed' ? 'Dead-Letter (DLQ)' : st}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-ink-secondary border border-border-subtle'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Jobs List Table */}
        <div className="bg-white border border-border-subtle rounded overflow-hidden">
          {isLoadingJobs ? (
            <div className="py-16 flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : (jobsData?.items || []).length === 0 ? (
            <div className="py-16 text-center text-ink-secondary space-y-2">
              <CheckCircle2 size={32} className="mx-auto text-slate-300" />
              <p className="text-sm font-editorial text-ink-primary">
                No jobs in [{selectedState}] state for this queue.
              </p>
              <p className="text-xs font-mono">
                {selectedState === 'failed'
                  ? 'All tasks are operating normally with zero Dead-Letter errors.'
                  : `There are currently no tasks waiting in ${selectedState} state.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border-subtle bg-canvas-paper text-ink-secondary font-mono uppercase tracking-wider text-[10px]">
                    <th className="p-3">Job ID</th>
                    <th className="p-3">Task Name</th>
                    <th className="p-3">Attempts</th>
                    <th className="p-3">Timestamps</th>
                    <th className="p-3">Diagnostic Reason / Payload</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-sans">
                  {jobsData?.items.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Job ID */}
                      <td className="p-3 font-mono font-medium text-ink-primary whitespace-nowrap">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px]">
                          {job.id}
                        </span>
                      </td>

                      {/* Job Name */}
                      <td className="p-3 font-mono text-ink-primary">
                        <div className="font-semibold">{job.name}</div>
                        {job.delay && job.delay > 0 ? (
                          <span className="text-[10px] text-indigo-600 font-mono">
                            Delay: {formatMs(job.delay)}
                          </span>
                        ) : null}
                      </td>

                      {/* Attempts */}
                      <td className="p-3 font-mono whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            job.attemptsMade > 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {job.attemptsMade} attempt{job.attemptsMade > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Timestamps */}
                      <td className="p-3 font-mono text-ink-secondary whitespace-nowrap text-[11px]">
                        <div>Created: {formatDate(job.timestamp)}</div>
                        {job.processedOn && <div>Started: {formatDate(job.processedOn)}</div>}
                        {job.finishedOn && <div>Finished: {formatDate(job.finishedOn)}</div>}
                      </td>

                      {/* Diagnostic Reason */}
                      <td className="p-3 max-w-xs truncate">
                        {job.failedReason ? (
                          <div className="flex items-center gap-1.5 text-rose-700 font-mono text-[11px] truncate">
                            <AlertCircle size={12} className="shrink-0" />
                            <span className="truncate">{job.failedReason}</span>
                          </div>
                        ) : (
                          <span className="text-ink-secondary font-mono text-[11px]">
                            State: {job.state} &middot; Progress: {job.progress}%
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setInspectJobId(job.id)}
                          className="px-2.5 py-1 border border-border-subtle bg-white hover:bg-slate-100 text-ink-primary text-xs font-mono rounded transition-colors inline-flex items-center gap-1"
                        >
                          <Terminal size={11} />
                          <span>Inspect</span>
                        </button>

                        {selectedState === 'failed' && (
                          <button
                            onClick={() => retrySingleMutation.mutate(job.id)}
                            disabled={retrySingleMutation.isPending}
                            className="px-2.5 py-1 bg-ink-primary hover:bg-slate-800 text-white text-xs font-mono rounded transition-colors inline-flex items-center gap-1"
                          >
                            <RotateCcw size={11} />
                            <span>Retry</span>
                          </button>
                        )}

                        <button
                          onClick={() => removeJobMutation.mutate(job.id)}
                          disabled={removeJobMutation.isPending}
                          className="px-2 py-1 text-slate-400 hover:text-rose-600 transition-colors inline-flex items-center"
                          title="Delete job"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {jobsData && jobsData.totalPages > 1 && (
            <div className="p-3 bg-canvas-paper border-t border-border-subtle flex items-center justify-between text-xs font-mono text-ink-secondary">
              <span>
                Page {jobsData.page} of {jobsData.totalPages} ({jobsData.total} total jobs)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 border border-border-subtle bg-white rounded disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(jobsData.totalPages, p + 1))}
                  disabled={page >= jobsData.totalPages}
                  className="px-2.5 py-1 border border-border-subtle bg-white rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Diagnostic Inspect Modal ───────────────────────────────── */}
      {inspectJobId && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans flex items-center justify-center p-4">
          <div
            onClick={() => setInspectJobId(null)}
            className="absolute inset-0 bg-ink-primary/40 backdrop-blur-xs transition-opacity"
          />

          <div className="relative w-full max-w-3xl bg-white border border-border-subtle shadow-2xl rounded-lg flex flex-col max-h-[90vh] z-10 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-border-subtle bg-canvas-paper flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold">
                  <Terminal size={12} />
                  <span>Job Diagnostic Inspector</span>
                </div>
                <h2 className="text-lg font-editorial font-bold text-ink-primary mt-0.5">
                  Job ID: {inspectJobId}
                </h2>
              </div>
              <button
                onClick={() => setInspectJobId(null)}
                className="p-1.5 text-ink-secondary hover:text-ink-primary rounded"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs font-mono">
              {isLoadingDetail ? (
                <div className="py-12 flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : jobDetail ? (
                <>
                  {/* Status Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 border border-border-subtle rounded">
                      <span className="text-[10px] text-ink-secondary block">State</span>
                      <span className="font-bold uppercase text-ink-primary">{jobDetail.state}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-border-subtle rounded">
                      <span className="text-[10px] text-ink-secondary block">Attempts</span>
                      <span className="font-bold text-ink-primary">{jobDetail.attemptsMade}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-border-subtle rounded">
                      <span className="text-[10px] text-ink-secondary block">Created</span>
                      <span className="font-bold text-ink-primary">{formatDate(jobDetail.timestamp)}</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-border-subtle rounded">
                      <span className="text-[10px] text-ink-secondary block">Finished</span>
                      <span className="font-bold text-ink-primary">{formatDate(jobDetail.finishedOn)}</span>
                    </div>
                  </div>

                  {/* Failure Reason */}
                  {jobDetail.failedReason && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-rose-900">
                        <AlertTriangle size={14} />
                        <span>Failure Diagnostic</span>
                      </div>
                      <p className="text-xs font-mono break-all">{jobDetail.failedReason}</p>
                    </div>
                  )}

                  {/* Error Stacktrace (Sanitized) */}
                  {jobDetail.stacktrace && jobDetail.stacktrace.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold uppercase tracking-wider text-ink-secondary text-[11px]">
                        Sanitized Error Stack Trace
                      </span>
                      <pre className="p-4 bg-slate-900 text-rose-300 rounded overflow-x-auto text-[11px] leading-relaxed">
                        {jobDetail.stacktrace.join('\n')}
                      </pre>
                    </div>
                  )}

                  {/* Sanitized Job Data JSON */}
                  <div className="space-y-2">
                    <span className="font-bold uppercase tracking-wider text-ink-secondary text-[11px]">
                      Sanitized Job Payload
                    </span>
                    <pre className="p-4 bg-slate-900 text-slate-100 rounded overflow-x-auto text-[11px] leading-relaxed">
                      {JSON.stringify(jobDetail.data, null, 2)}
                    </pre>
                  </div>

                  {/* Job Options JSON */}
                  <div className="space-y-2">
                    <span className="font-bold uppercase tracking-wider text-ink-secondary text-[11px]">
                      Job Configuration Options
                    </span>
                    <pre className="p-4 bg-slate-900 text-slate-200 rounded overflow-x-auto text-[11px] leading-relaxed">
                      {JSON.stringify(jobDetail.opts, null, 2)}
                    </pre>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-canvas-paper border-t border-border-subtle flex items-center justify-between">
              <button
                onClick={() => removeJobMutation.mutate(inspectJobId)}
                disabled={removeJobMutation.isPending}
                className="px-3 py-1.5 text-rose-600 hover:text-rose-800 font-mono text-xs flex items-center gap-1 transition-colors"
              >
                <Trash2 size={13} />
                <span>Delete Job</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInspectJobId(null)}
                  className="px-3.5 py-1.5 border border-border-subtle bg-white text-ink-primary font-mono text-xs rounded"
                >
                  Close
                </button>
                {jobDetail?.state === 'failed' && (
                  <button
                    onClick={() => retrySingleMutation.mutate(inspectJobId)}
                    disabled={retrySingleMutation.isPending}
                    className="px-4 py-1.5 bg-ink-primary hover:bg-slate-800 text-white font-mono text-xs rounded flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw size={12} />
                    <span>Retry Job</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
