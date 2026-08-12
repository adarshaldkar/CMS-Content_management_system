import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Database,
  Filter,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  User,
  XCircle,
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

  const actionColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    LOGIN_SUCCESS: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', icon: <KeyRound size={13} /> },
    LOGIN_FAILURE: { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', icon: <ShieldAlert size={13} /> },
    ROLE_CHANGED: { bg: 'bg-purple-50 text-purple-700', text: 'text-purple-700', icon: <Shield size={13} /> },
    PASSWORD_CHANGED: { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', icon: <Lock size={13} /> },
    DB_SWITCH_SUCCESS: { bg: 'bg-amber-50 text-amber-700', text: 'text-amber-700', icon: <Database size={13} /> },
    ARTICLE_CREATED: { bg: 'bg-sky-50 text-sky-700', text: 'text-sky-700', icon: <Activity size={13} /> },
    ARTICLE_PUBLISHED: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', icon: <CheckCircle2 size={13} /> },
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-accent-crimson font-semibold mb-1">
            <Shield size={15} />
            <span>Security & Compliance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-bold text-ink-primary">
            Immutable Audit Trail Explorer
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Cryptographically sealed timeline of all administrative operations, authentication events, and data switches.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-border-subtle rounded-lg text-xs font-medium text-ink-secondary hover:text-ink-primary transition-colors shadow-sm self-start sm:self-auto"
        >
          <RefreshCw size={13} />
          <span>Refresh Trail</span>
        </button>
      </div>

      {/* Search & Action Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-border-subtle">
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, resource, or actor ID..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-secondary" />
        </div>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="px-3 py-2 text-xs bg-white border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 font-mono text-ink-primary"
        >
          <option value="all">All Security Events</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
          <option value="ROLE_CHANGED">ROLE_CHANGED</option>
          <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
          <option value="DB_SWITCH_SUCCESS">DB_SWITCH_SUCCESS</option>
          <option value="ARTICLE_CREATED">ARTICLE_CREATED</option>
          <option value="ARTICLE_PUBLISHED">ARTICLE_PUBLISHED</option>
        </select>
      </div>

      {/* Audit Log Timeline */}
      {isLoading ? (
        <div className="py-20 text-center">
          <LoadingSpinner label="Decrypting audit records..." />
        </div>
      ) : filteredLogs.length > 0 ? (
        <div className="bg-white border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-border-subtle font-mono uppercase text-[11px] text-ink-secondary">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Action</th>
                  <th className="px-6 py-3.5 font-semibold">Resource</th>
                  <th className="px-6 py-3.5 font-semibold">Actor</th>
                  <th className="px-6 py-3.5 font-semibold">Result</th>
                  <th className="px-6 py-3.5 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-mono">
                {filteredLogs.map((log) => {
                  const style = actionColors[log.action] || {
                    bg: 'bg-slate-100 text-slate-700',
                    text: 'text-slate-700',
                    icon: <Activity size={13} />,
                  };

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold ${style.bg}`}
                        >
                          {style.icon}
                          <span>{log.action}</span>
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-ink-primary font-medium">
                        {log.resource}
                      </td>

                      <td className="px-6 py-3.5 text-ink-secondary text-[11px]">
                        {log.actorId ? log.actorId.slice(0, 8) + '...' : 'System'}
                      </td>

                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.result === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {log.result === 'SUCCESS' ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                          <span>{log.result}</span>
                        </span>
                      </td>

                      <td className="px-6 py-3.5 text-ink-secondary text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-border-subtle rounded-2xl">
          <Shield size={28} className="mx-auto text-ink-secondary mb-2" />
          <p className="text-xs font-semibold text-ink-primary">No audit log records match your filter</p>
        </div>
      )}
    </div>
  );
};
