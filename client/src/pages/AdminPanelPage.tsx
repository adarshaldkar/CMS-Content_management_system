import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  Database,
  History,
  FolderTree,
  Plus,
  Server,
  ArrowLeft,
} from 'lucide-react';
import { fetchHealth } from '../api/client';
import { listArticles } from '../api/articles.api';
import type { Article } from '../types';

const adminNav = [
  { name: 'Dashboard', icon: Server },
  { name: 'Articles & Workflow', icon: FileText },
  { name: 'Media Library', icon: FolderTree },
  { name: 'Audit Logs', icon: History },
  { name: 'Database Switcher', icon: Database },
];

export function AdminPanelPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [healthData, setHealthData] = useState<any>(null);
  const [publishedCount, setPublishedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      const health = await fetchHealth();
      setHealthData(health);

      const [pubRes, pendRes] = await Promise.all([
        listArticles({ status: 'published', limit: 5 }),
        listArticles({ status: 'pending_review', limit: 5 }),
      ]);

      setPublishedCount(pubRes.total);
      setPendingCount(pendRes.total);
      setRecentArticles(pubRes.items);
    } catch {
      // safe ignore
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900/60 p-6 md:block">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-indigo-400">
              Admin Platform
            </p>
            <p className="font-serif text-lg font-bold text-white">Control Panel</p>
          </div>
        </div>

        <nav className="space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.name)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === item.name
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.name}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              Admin Panel · Phase 4 Verified
            </span>
            <h1 className="font-editorial text-3xl font-bold text-white mt-2">
              System Administration
            </h1>
          </div>

          <Link
            to="/editor"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Open CMS Studio
          </Link>
        </div>

        {/* Real-time Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Pending Reviews</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="font-serif text-3xl font-bold text-white">{pendingCount}</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Published Articles</span>
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="font-serif text-3xl font-bold text-white">{publishedCount}</p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Active Database</span>
              <Database className="w-4 h-4 text-indigo-400" />
            </div>
            <p className="font-mono text-xl font-bold text-indigo-300 uppercase">
              {healthData?.activeDatabase || 'postgres'}
            </p>
          </div>
        </div>

        {/* Recent Articles */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Recent Published Stories</h2>
          {recentArticles.length === 0 ? (
            <p className="text-xs text-slate-500">No published articles available.</p>
          ) : (
            <div className="space-y-3">
              {recentArticles.map((art) => (
                <div
                  key={art.id}
                  onClick={() => navigate(`/editor/${art.id}`)}
                  className="p-3.5 rounded-xl border border-slate-800 hover:border-indigo-500/50 bg-slate-950 flex items-center justify-between cursor-pointer transition"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{art.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{art.description}</p>
                  </div>
                  <span className="text-xs text-indigo-400 font-semibold">v{art.version}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
