import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AdminRoute: React.FC = () => {
  const { user, isAuthenticated, isLoading, hasCheckedAuth, checkAuth, hasRole } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuth();
    }
  }, [hasCheckedAuth, checkAuth]);

  if (isLoading && !hasCheckedAuth) {
    return <LoadingSpinner fullPage label="Verifying high-assurance administrative credentials..." />;
  }

  // 1. Unauthenticated users are sent to login with redirect
  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} state={{ from: location }} replace />;
  }

  // 2. Authenticated users without staff role are blocked with explicit 403 Security Screen
  const isStaff = hasRole(['super_admin', 'admin', 'editor']);
  if (!isStaff) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between font-sans">
        <header className="border-b border-slate-800 py-4 px-6 sm:px-12 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-500 font-mono text-xs font-bold uppercase tracking-widest">
            <Lock size={15} />
            <span>Gazette Security Perimeter</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Session: {user?.email}
          </span>
        </header>

        <main className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-xl">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-rose-500/20 text-rose-400 text-[11px] font-mono font-bold uppercase tracking-widest rounded-full">
              403 Forbidden · Insufficient Permissions
            </span>
            <h1 className="text-2xl sm:text-3xl font-editorial font-bold tracking-tight text-white">
              Administrative Access Restricted
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-sans max-w-md mx-auto">
              Your account (<span className="text-slate-200 font-mono">{user?.name}</span>, role:{' '}
              <span className="text-amber-400 font-mono uppercase">{user?.role}</span>) does not possess administrative governance clearance for this zone.
            </p>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-left space-y-1.5 font-mono text-[11px] text-slate-400">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-rose-400">
                <AlertTriangle size={13} />
                <span>Security Notice:</span>
              </span>
              <span className="text-[10px] text-slate-500">EVENT_PERM_DENIED</span>
            </div>
            <p className="text-slate-400">
              Unauthorized access attempts to the administrative control suite are logged with cryptographic timestamps in the system audit registry.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 font-semibold text-xs rounded-lg hover:bg-slate-200 transition-colors font-mono"
            >
              <ArrowLeft size={14} />
              <span>Return to Author Workspace</span>
            </Link>
          </div>
        </main>

        <footer className="py-4 border-t border-slate-900 text-center text-[11px] font-mono text-slate-600">
          The Gazette High-Assurance Core · OWASP A01 Access Control Enforced
        </footer>
      </div>
    );
  }

  return <Outlet />;
};
