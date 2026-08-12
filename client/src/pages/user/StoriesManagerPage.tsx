import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  MoreVertical,
  PenTool,
  Plus,
  Search,
  Send,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { apiClient } from '../../api/client';
import type { Article, ArticleStatus, PaginatedResult } from '../../types';

export const StoriesManagerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['authorStories', user?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
        params: { limit: 100 },
      });
      return data;
    },
    enabled: Boolean(user?.id),
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async (articleId: string) => {
      await apiClient.post(`/articles/${articleId}/transition`, {
        targetStatus: 'pending_review',
        changeSummary: 'Submitted for editorial review by author',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorStories'] });
      queryClient.invalidateQueries({ queryKey: ['authorArticles'] });
    },
  });

  const deleteDraftMutation = useMutation({
    mutationFn: async (articleId: string) => {
      await apiClient.delete(`/articles/${articleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authorStories'] });
      queryClient.invalidateQueries({ queryKey: ['authorArticles'] });
    },
  });

  const articles = articlesData?.items || [];

  // Filter tabs definition with status mapping
  const tabs = [
    { id: 'all', label: 'All Stories', count: articles.length },
    { id: 'draft', label: 'Drafts', count: articles.filter((a) => a.status === 'draft').length },
    {
      id: 'pending_review',
      label: 'In Review',
      count: articles.filter((a) => a.status === 'pending_review').length,
    },
    {
      id: 'approved',
      label: 'Approved',
      count: articles.filter((a) => a.status === 'approved').length,
    },
    {
      id: 'published',
      label: 'Published',
      count: articles.filter((a) => a.status === 'published').length,
    },
    {
      id: 'scheduled',
      label: 'Scheduled',
      count: articles.filter((a) => a.status === 'scheduled').length,
    },
    {
      id: 'rejected',
      label: 'Changes Requested',
      count: articles.filter((a) => a.status === 'rejected').length,
    },
    {
      id: 'archived',
      label: 'Archived',
      count: articles.filter((a) => a.status === 'archived').length,
    },
  ];

  const filteredArticles = articles.filter((article) => {
    const matchesTab = activeTab === 'all' || article.status === activeTab;
    const matchesSearch =
      searchQuery.trim() === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-editorial font-bold text-ink-primary">Stories & Drafts</h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            Manage your articles across all editorial lifecycle stages
          </p>
        </div>

        <Link
          to="/editor"
          className="inline-flex items-center gap-2 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-semibold tracking-wide transition-colors shadow-sm self-start sm:self-auto"
        >
          <PenTool size={14} />
          <span>Write Story</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-border-subtle">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-slate-100 text-ink-primary font-semibold border border-slate-300'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeTab === tab.id
                    ? 'bg-ink-primary text-white'
                    : 'bg-slate-100 text-ink-secondary'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search inside stories */}
        <div className="relative">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within your stories by title or excerpt..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-crimson/20 focus:border-accent-crimson transition-all"
          />
          <Search
            size={15}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-ink-secondary"
          />
        </div>
      </div>

      {/* Stories List / Table */}
      <div className="bg-white border border-border-subtle rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <LoadingSpinner label="Loading stories lifecycle..." />
          </div>
        ) : filteredArticles.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:bg-slate-50/50 transition-colors"
              >
                {/* Story details */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Cover thumbnail */}
                  <div className="w-20 h-20 rounded-lg bg-slate-100 border border-border-subtle shrink-0 overflow-hidden flex items-center justify-center text-slate-400">
                    {article.coverImage ? (
                      <img
                        src={article.coverImage}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText size={24} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <StatusBadge status={article.status} />
                      <span className="text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-ink-secondary font-medium">
                        v{article.version}
                      </span>
                      <span className="text-[11px] font-mono text-ink-secondary">
                        {article.wordCount || 0} words · {article.readingTimeMinutes || 1} min read
                      </span>
                    </div>

                    <h3 className="text-base font-editorial font-bold text-ink-primary truncate">
                      {article.title.replace(/\s\d{10,}/g, '')}
                    </h3>
                    <p className="text-xs text-ink-secondary mt-1 line-clamp-2 leading-relaxed">
                      {article.description || 'No summary excerpt provided.'}
                    </p>

                    {/* Review Feedback if rejected */}
                    {article.status === 'rejected' && article.reviewNote && (
                      <div className="mt-2.5 p-2.5 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2">
                        <AlertCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
                        <div className="text-xs text-rose-700">
                          <span className="font-semibold">Editorial Feedback:</span>{' '}
                          {article.reviewNote}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Menu */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Link
                    to={`/editor/${article.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-ink-primary rounded-lg text-xs font-medium transition-colors"
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </Link>

                  {article.status === 'draft' && (
                    <button
                      onClick={() => submitForReviewMutation.mutate(article.id)}
                      disabled={submitForReviewMutation.isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium transition-colors"
                      title="Submit for editorial review"
                    >
                      <Send size={13} />
                      <span>Submit</span>
                    </button>
                  )}

                  {article.status === 'published' && (
                    <Link
                      to={`/articles/${article.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </Link>
                  )}

                  {article.status === 'draft' && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this draft?')) {
                          deleteDraftMutation.mutate(article.id);
                        }
                      }}
                      disabled={deleteDraftMutation.isPending}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete draft"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-ink-secondary">
              <FileText size={20} />
            </div>
            <p className="text-xs font-semibold text-ink-primary">No stories found in this tab</p>
            <p className="text-xs text-ink-secondary mt-1">
              {searchQuery ? 'Try clearing your search query.' : 'Draft a new story to get started.'}
            </p>
            <Link
              to="/editor"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-ink-primary hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Plus size={14} />
              <span>Write Story</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
