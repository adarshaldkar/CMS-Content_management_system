import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';
import { ScrollToTop } from './components/common/ScrollToTop';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { EditorialErrorBoundary } from './components/common/EditorialErrorBoundary';
import { useAuthStore } from './stores/authStore';

// ─── Route Code-Splitting with React.lazy (Optimized Performance) ──
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ArticleReaderPage = lazy(() => import('./pages/ArticleReaderPage').then((m) => ({ default: m.ArticleReaderPage })));
const CategoryArchivePage = lazy(() => import('./pages/CategoryArchivePage').then((m) => ({ default: m.CategoryArchivePage })));
const TagArchivePage = lazy(() => import('./pages/TagArchivePage').then((m) => ({ default: m.TagArchivePage })));
const ForYouFeedPage = lazy(() => import('./pages/ForYouFeedPage').then((m) => ({ default: m.ForYouFeedPage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then((m) => ({ default: m.SearchPage })));
const NewsletterVerifyPage = lazy(() => import('./pages/newsletter/NewsletterVerifyPage').then((m) => ({ default: m.NewsletterVerifyPage })));
const NewsletterPreferencesPage = lazy(() => import('./pages/newsletter/NewsletterPreferencesPage').then((m) => ({ default: m.NewsletterPreferencesPage })));

// Auth Pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const OnboardingPage = lazy(() => import('./pages/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })));

// User / Author Workspace Pages
const UserDashboardPage = lazy(() => import('./pages/user/UserDashboardPage').then((m) => ({ default: m.UserDashboardPage })));
const StoriesManagerPage = lazy(() => import('./pages/user/StoriesManagerPage').then((m) => ({ default: m.StoriesManagerPage })));
const UserProfilePage = lazy(() => import('./pages/user/UserProfilePage').then((m) => ({ default: m.UserProfilePage })));
const UserSettingsPage = lazy(() => import('./pages/user/UserSettingsPage').then((m) => ({ default: m.UserSettingsPage })));
const UserLibraryPage = lazy(() => import('./pages/user/UserLibraryPage').then((m) => ({ default: m.UserLibraryPage })));
const ArticleEditorPage = lazy(() => import('./pages/ArticleEditorPage').then((m) => ({ default: m.ArticleEditorPage })));

// Admin Governance Pages
const EditorialReviewPage = lazy(() => import('./pages/admin/EditorialReviewPage').then((m) => ({ default: m.EditorialReviewPage })));
const UserManagementPage = lazy(() => import('./pages/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage })));
const TaxonomyManagerPage = lazy(() => import('./pages/admin/TaxonomyManagerPage').then((m) => ({ default: m.TaxonomyManagerPage })));
const MediaLibraryPage = lazy(() => import('./pages/admin/MediaLibraryPage').then((m) => ({ default: m.MediaLibraryPage })));
const CommentsModerationPage = lazy(() => import('./pages/admin/CommentsModerationPage').then((m) => ({ default: m.CommentsModerationPage })));
const AuditLogExplorerPage = lazy(() => import('./pages/admin/AuditLogExplorerPage').then((m) => ({ default: m.AuditLogExplorerPage })));
const DatabaseSwitcherPage = lazy(() => import('./pages/admin/DatabaseSwitcherPage').then((m) => ({ default: m.DatabaseSwitcherPage })));
const PublishingSlotsManagerPage = lazy(() => import('./pages/admin/PublishingSlotsManagerPage').then((m) => ({ default: m.PublishingSlotsManagerPage })));
const JobsManagerPage = lazy(() => import('./pages/admin/JobsManagerPage').then((m) => ({ default: m.JobsManagerPage })));
const NewsletterManagerPage = lazy(() => import('./pages/admin/NewsletterManagerPage').then((m) => ({ default: m.NewsletterManagerPage })));
const AdminPanelPage = lazy(() => import('./pages/AdminPanelPage').then((m) => ({ default: m.AdminPanelPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const PageLoaderFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center p-8">
    <LoadingSpinner label="Loading dispatch..." />
  </div>
);

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<PageLoaderFallback />}>
        <EditorialErrorBoundary fallbackTitle="Application Section Unavailable" fallbackMessage="An issue prevented this section of The Gazette from rendering properly.">
          <Routes>
            {/* 1. Public Editorial Layout */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/articles/:slug" element={<ArticleReaderPage />} />
              <Route path="/category/:slug" element={<CategoryArchivePage />} />
              <Route path="/tags/:slug" element={<TagArchivePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/feed" element={<ForYouFeedPage />} />
              <Route path="/newsletter/verify/:token" element={<NewsletterVerifyPage />} />
              <Route path="/newsletter/preferences/:token" element={<NewsletterPreferencesPage />} />
            </Route>

            {/* 2. Public-Only Auth Routes */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Route>

            {/* 3. Onboarding Flow (Protected) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/onboarding" element={<OnboardingPage />} />
            </Route>

            {/* 4. Full-Screen Editorial Studio (Protected) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/editor" element={<ArticleEditorPage />} />
              <Route path="/editor/:id" element={<ArticleEditorPage />} />
              <Route path="/write" element={<ArticleEditorPage />} />
              <Route path="/write/:id" element={<ArticleEditorPage />} />
            </Route>

            {/* 5. User / Author Workspace (Protected) */}
            <Route element={<ProtectedRoute />}>
              <Route element={<UserLayout />}>
                <Route path="/dashboard" element={<UserDashboardPage />} />
                <Route path="/stories" element={<StoriesManagerPage />} />
                <Route path="/workspace" element={<StoriesManagerPage />} />
                <Route path="/library" element={<UserLibraryPage />} />
                <Route path="/history" element={<UserLibraryPage />} />
                <Route path="/network" element={<UserDashboardPage />} />
                <Route path="/profile" element={<UserProfilePage />} />
                <Route path="/settings" element={<UserSettingsPage />} />
                <Route path="/user" element={<UserDashboardPage />} />
                <Route path="/user/*" element={<UserDashboardPage />} />
              </Route>
            </Route>

            {/* 6. Admin Governance Suite (Role Protected) */}
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<AdminPanelPage />} />
                <Route path="/admin/overview" element={<AdminPanelPage />} />
                <Route path="/admin/dashboard" element={<AdminPanelPage />} />
                <Route path="/admin/panel" element={<AdminPanelPage />} />
                <Route path="/admin/review" element={<EditorialReviewPage />} />
                <Route path="/admin/slots" element={<PublishingSlotsManagerPage />} />
                <Route path="/admin/users" element={<UserManagementPage />} />
                <Route path="/admin/categories" element={<TaxonomyManagerPage />} />
                <Route path="/admin/tags" element={<TaxonomyManagerPage />} />
                <Route path="/admin/media" element={<MediaLibraryPage />} />
                <Route path="/admin/comments" element={<CommentsModerationPage />} />
                <Route path="/admin/audit" element={<AuditLogExplorerPage />} />
                <Route path="/admin/database" element={<DatabaseSwitcherPage />} />
                <Route path="/admin/jobs" element={<JobsManagerPage />} />
                <Route path="/admin/newsletter" element={<NewsletterManagerPage />} />
                <Route path="/admin/*" element={<AdminPanelPage />} />
              </Route>
            </Route>

            {/* 7. Dedicated 404 Catch-All Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </EditorialErrorBoundary>
      </Suspense>
    </BrowserRouter>
  );
}
