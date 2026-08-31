import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  CheckSquare,
  Clock,
  Database,
  FileCheck,
  FileText,
  FolderTree,
  HardDrive,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { apiClient, fetchHealth } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import type { Article, PaginatedResult } from '../types';

export const AdminPanelPage: React.FC = () => {
  const { user } = useAuthStore();

  // 1. Health & Telemetry
  const { data: health, isLoading: isHealthLoading } = useQuery({
    queryKey: ['systemHealthTelemetry'],
    queryFn: fetchHealth,
    refetchInterval: 5000,
  });

  const { data: dbStatus } = useQuery({
    queryKey: ['databaseStatusTelemetry'],
    queryFn: async () => {
      const { data } = await apiClient.get('/database/status');
      return data;
    },
    refetchInterval: 5000,
  });

  // 2. Editorial Metrics
  const { data: pendingArticles, isLoading: isPendingLoading } = useQuery({
    queryKey: ['adminMetricPending'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'pending_review', limit: 5 },
      });
      return data;
    },
  });

  const { data: publishedArticles, isLoading: isPubLoading } = useQuery({
    queryKey: ['adminMetricPublished'],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { status: 'published', limit: 5 },
      });
      return data;
    },
  });

  const activeDatabase = (dbStatus?.activeDatabase || health?.activeDatabase || 'postgres').toUpperCase();
  const pendingCount = pendingArticles?.total ?? 0;
  const publishedCount = publishedArticles?.total ?? 0;

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-accent-crimson font-semibold mb-1">
            <LayoutDashboard size={13} />
            <span>Platform Overview & Telemetry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-semibold text-ink-primary">
            System Control Panel
          </h1>
          <p className="text-xs text-ink-secondary mt-1">
            Real-time infrastructure health, editorial governance metrics, and operational dispatch controls.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/editor"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-ink-primary hover:bg-slate-800 text-white text-xs font-semibold tracking-wide transition-colors"
            style={{ borderRadius: 2 }}
          >
            <Sparkles size={13} />
            <span>Open Studio</span>
          </Link>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Reviews */}
        <div className="bg-white border border-border-subtle p-5 relative overflow-hidden" style={{ borderRadius: 2 }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-medium">
              Review Queue
            </span>
            <div className="w-8 h-8 rounded bg-amber-50 text-amber-700 flex items-center justify-center">
              <CheckSquare size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-ink-primary">
              {isPendingLoading ? '...' : pendingCount}
            </div>
            <p className="text-[11px] text-ink-secondary mt-1">
              {pendingCount === 1 ? '1 manuscript awaiting review' : `${pendingCount} manuscripts awaiting review`}
            </p>
          </div>
          <Link
            to="/admin/review"
            className="mt-4 inline-flex items-center gap-1 text-[11px] font-mono text-accent-crimson hover:underline font-semibold"
          >
            <span>Inspect Queue</span>
            <ArrowUpRight size={12} />
          </Link>
        </div>

        {/* Published Articles */}
        <div className="bg-white border border-border-subtle p-5 relative overflow-hidden" style={{ borderRadius: 2 }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-medium">
              Live Publications
            </span>
            <div className="w-8 h-8 rounded bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <FileCheck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-ink-primary">
              {isPubLoading ? '...' : publishedCount}
            </div>
            <p className="text-[11px] text-ink-secondary mt-1">Stories live in circulation</p>
          </div>
          <Link
            to="/search"
            className="mt-4 inline-flex items-center gap-1 text-[11px] font-mono text-accent-crimson hover:underline font-semibold"
          >
            <span>Explore Archive</span>
            <ArrowUpRight size={12} />
          </Link>
        </div>

        {/* Active Database Mesh Engine */}
        <div className="bg-white border border-border-subtle p-5 relative overflow-hidden" style={{ borderRadius: 2 }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-medium">
              Storage Engine
            </span>
            <div className="w-8 h-8 rounded bg-sky-50 text-sky-700 flex items-center justify-center">
              <Database size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold font-mono text-ink-primary flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{activeDatabase}</span>
            </div>
            <p className="text-[11px] text-ink-secondary mt-1">Multi-Database Mesh active</p>
          </div>
          <Link
            to="/admin/database"
            className="mt-4 inline-flex items-center gap-1 text-[11px] font-mono text-accent-crimson hover:underline font-semibold"
          >
            <span>Database Switcher</span>
            <ArrowUpRight size={12} />
          </Link>
        </div>

        {/* Security & Clearance */}
        <div className="bg-white border border-border-subtle p-5 relative overflow-hidden" style={{ borderRadius: 2 }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary font-medium">
              Security Level
            </span>
            <div className="w-8 h-8 rounded bg-purple-50 text-purple-700 flex items-center justify-center">
              <Shield size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold font-mono text-ink-primary truncate uppercase">
              {user?.role || 'SUPER_ADMIN'}
            </div>
            <p className="text-[11px] text-ink-secondary mt-1">High-Assurance Session Active</p>
          </div>
          <Link
            to="/admin/audit"
            className="mt-4 inline-flex items-center gap-1 text-[11px] font-mono text-accent-crimson hover:underline font-semibold"
          >
            <span>View Audit Trail</span>
            <ArrowUpRight size={12} />
          </Link>
        </div>
      </div>

      {/* Editorial Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Published Stories */}
        <div className="lg:col-span-2 bg-white border border-border-subtle p-6" style={{ borderRadius: 2 }}>
          <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-accent-crimson" />
              <h2 className="text-base font-editorial font-semibold text-ink-primary">
                Recently Published Stories
              </h2>
            </div>
            <Link
              to="/admin/review"
              className="text-xs font-mono text-ink-secondary hover:text-ink-primary transition-colors"
            >
              All Stories →
            </Link>
          </div>

          {isPubLoading ? (
            <div className="py-12 text-center">
              <LoadingSpinner label="Loading published feed..." />
            </div>
          ) : (publishedArticles?.items?.length ?? 0) === 0 ? (
            <div className="py-12 text-center text-xs text-ink-secondary font-mono">
              No published stories found.
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {publishedArticles?.items.map((art) => (
                <div key={art.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono uppercase font-semibold text-accent-crimson tracking-wider">
                        {art.categoryName || 'General'}
                      </span>
                      <span className="text-ink-secondary/40 text-xs">·</span>
                      <span className="text-[11px] text-ink-secondary font-mono">
                        {art.authorName || 'Editorial Staff'}
                      </span>
                    </div>
                    <Link
                      to={`/articles/${art.slug}`}
                      className="text-sm font-editorial font-semibold text-ink-primary hover:text-accent-crimson transition-colors line-clamp-1"
                    >
                      {art.title}
                    </Link>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/write/${art.id}`}
                      className="px-2.5 py-1 text-xs font-mono border border-border-subtle hover:border-ink-primary transition-colors text-ink-primary"
                      style={{ borderRadius: 2 }}
                    >
                      Edit
                    </Link>
                    <Link
                      to={`/articles/${art.slug}`}
                      className="px-2.5 py-1 text-xs font-mono bg-canvas-paper hover:bg-slate-100 transition-colors text-ink-primary border border-border-subtle"
                      style={{ borderRadius: 2 }}
                    >
                      View Live
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Quick Administration Shortcuts */}
        <div className="bg-white border border-border-subtle p-6 space-y-4" style={{ borderRadius: 2 }}>
          <div className="flex items-center gap-2 border-b border-border-subtle pb-4">
            <Activity size={15} className="text-accent-crimson" />
            <h2 className="text-base font-editorial font-semibold text-ink-primary">
              Management Suites
            </h2>
          </div>

          <div className="space-y-2">
            {[
              {
                title: 'Review Queue',
                desc: 'Review submissions, evaluate diff revisions, and publish.',
                to: '/admin/review',
                icon: CheckSquare,
              },
              {
                title: 'Publishing Slots',
                desc: 'Assign authors to automated recurring publishing slots.',
                to: '/admin/slots',
                icon: Clock,
              },
              {
                title: 'User Directory',
                desc: 'Assign editorial roles and activate or suspend accounts.',
                to: '/admin/users',
                icon: Users,
              },
              {
                title: 'Taxonomy & Categories',
                desc: 'Configure topics, categories, and article tag hierarchies.',
                to: '/admin/categories',
                icon: FolderTree,
              },
              {
                title: 'Comments Moderation',
                desc: 'Govern discussion threads and enforce community rules.',
                to: '/admin/comments',
                icon: MessageSquare,
              },
              {
                title: 'Audit Trail & Security',
                desc: 'Inspect granular actor telemetry, IP logs, and mutations.',
                to: '/admin/audit',
                icon: ScrollText,
              },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-start gap-3 p-2.5 border border-border-subtle hover:border-ink-primary hover:bg-slate-50/50 transition-colors block"
                style={{ borderRadius: 2 }}
              >
                <div className="p-1.5 bg-canvas-paper border border-border-subtle text-ink-primary shrink-0 mt-0.5" style={{ borderRadius: 2 }}>
                  <item.icon size={13} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-ink-primary font-sans">{item.title}</h3>
                  <p className="text-[11px] text-ink-secondary leading-snug mt-0.5">{item.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
