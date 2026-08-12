import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CheckCircle2,
  Database,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import type { AuditLog } from '../../types';

export const AuditLogExplorerPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: async () => {
      const { data } = await apiClient.get<AuditLog[]>('/audit', {
        params: { limit: 100 },
      });
      return data;
    },
  });

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      !searchTerm ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actorId && log.actorId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const actionConfig: Record<string, { label: string; dot: string }> = {
    LOGIN_SUCCESS: { label: 'Login Success', dot: 'bg-emerald-500' },
    LOGIN_FAILURE: { label: 'Login Failed', dot: 'bg-rose-500' },
    ROLE_CHANGED: { label: 'Role Changed', dot: 'bg-purple-500' },
    PASSWORD_CHANGED: { label: 'Password Changed', dot: 'bg-sky-500' },
    DB_SWITCH_SUCCESS: { label: 'Database Switched', dot: 'bg-amber-500' },
    ARTICLE_CREATED: { label: 'Article Created', dot: 'bg-sky-500' },
    ARTICLE_PUBLISHED: { label: 'Article Published', dot: 'bg-emerald-500' },
    COMMENT_CREATED: { label: 'Comment Added', dot: 'bg-emerald-500' },
    LIKE_TOGGLED: { label: 'Like Toggled', dot: 'bg-rose-400' },
    FOLLOW_CREATED: { label: 'Follow Created', dot: 'bg-sky-400' },
    BOOKMARK_CREATED: { label: 'Bookmark Added', dot: 'bg-amber-400' },
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <Shield size={13} />
            <span>Security & Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            Immutable Audit Trail
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Cryptographically sealed ledger of all administrative events, authentication actions, and database switches.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border-subtle text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors self-start sm:self-auto font-mono"
          style={{ borderRadius: 2 }}
        >
          <RefreshCw size={12} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 border border-border-subtle" style={{ borderRadius: 2 }}>
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, resource, or actor ID…"
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-canvas-paper border border-border-subtle focus:outline-none focus:border-ink-primary font-sans"
            style={{ borderRadius: 2 }}
          />
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-secondary" />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="px-3 py-1.5 text-xs bg-canvas-paper border border-border-subtle focus:outline-none focus:border-ink-primary font-mono text-ink-primary"
          style={{ borderRadius: 2 }}
        >
          <option value="all">All Security Events ({logs.length})</option>
          <option value="LOGIN_SUCCESS">Login Success</option>
          <option value="LOGIN_FAILURE">Login Failure</option>
          <option value="ROLE_CHANGED">Role Changed</option>
          <option value="PASSWORD_CHANGED">Password Changed</option>
          <option value="DB_SWITCH_SUCCESS">Database Switch</option>
          <option value="ARTICLE_CREATED">Article Created</option>
          <option value="ARTICLE_PUBLISHED">Article Published</option>
          <option value="COMMENT_CREATED">Comment Created</option>
          <option value="LIKE_TOGGLED">Like Toggled</option>
          <option value="FOLLOW_CREATED">Follow Created</option>
          <option value="BOOKMARK_CREATED">Bookmark Created</option>
        </select>
      </div>

      {/* Audit Log Ledger Table */}
      <div className="bg-white border border-border-subtle overflow-hidden" style={{ borderRadius: 2 }}>
        {isLoading ? (
          <div className="p-16 text-center">
            <LoadingSpinner label="Decrypting audit ledger..." />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center text-xs text-ink-secondary font-editorial italic">
            No audit records match the current filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-canvas-paper text-[10px] font-mono uppercase tracking-wider text-ink-secondary">
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Resource</th>
                  <th className="py-3 px-4 font-semibold">Actor ID</th>
                  <th className="py-3 px-4 font-semibold">Result</th>
                  <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle text-xs">
                {filteredLogs.map((log) => {
                  const cfg = actionConfig[log.action] || {
                    label: log.action,
                    dot: 'bg-slate-400',
                  };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Action */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          <span className="font-mono text-[11px] font-semibold text-ink-primary uppercase tracking-wide">
                            {log.action}
                          </span>
                        </div>
                      </td>

                      {/* Resource */}
                      <td className="py-3 px-4 font-mono text-[11px] text-ink-secondary max-w-[280px] truncate">
                        {log.resource}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 font-mono text-[11px] text-ink-secondary">
                        {log.actorId ? (
                          <span title={log.actorId}>{log.actorId.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-ink-secondary/50">system</span>
                        )}
                      </td>

                      {/* Result */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase ${
                            log.result === 'SUCCESS' ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {log.result === 'SUCCESS' ? '✓ SUCCESS' : '✕ FAILURE'}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-ink-secondary tabular-nums whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('en-US', {
                          month: 'numeric',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
