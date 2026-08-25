import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { UserLayout } from './components/layout/UserLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AdminRoute } from './routes/AdminRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';
import { HomePage } from './pages/HomePage';
import { ArticleReaderPage } from './pages/ArticleReaderPage';
import { CategoryArchivePage } from './pages/CategoryArchivePage';
import { TagArchivePage } from './pages/TagArchivePage';
import { ForYouFeedPage } from './pages/ForYouFeedPage';
import { SearchPage } from './pages/SearchPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { UserDashboardPage } from './pages/user/UserDashboardPage';
import { StoriesManagerPage } from './pages/user/StoriesManagerPage';
import { UserProfilePage } from './pages/user/UserProfilePage';
import { UserSettingsPage } from './pages/user/UserSettingsPage';
import { UserLibraryPage } from './pages/user/UserLibraryPage';
import { ArticleEditorPage } from './pages/ArticleEditorPage';

// Admin Governance Pages
import { EditorialReviewPage } from './pages/admin/EditorialReviewPage';
import { UserManagementPage } from './pages/admin/UserManagementPage';
import { TaxonomyManagerPage } from './pages/admin/TaxonomyManagerPage';
import { MediaLibraryPage } from './pages/admin/MediaLibraryPage';
import { CommentsModerationPage } from './pages/admin/CommentsModerationPage';
import { AuditLogExplorerPage } from './pages/admin/AuditLogExplorerPage';
import { DatabaseSwitcherPage } from './pages/admin/DatabaseSwitcherPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ScrollToTop } from './components/common/ScrollToTop';

import { useAuthStore } from './stores/authStore';

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* 1. Public Editorial Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/articles/:slug" element={<ArticleReaderPage />} />
          <Route path="/category/:slug" element={<CategoryArchivePage />} />
          <Route path="/tags/:slug" element={<TagArchivePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/feed" element={<ForYouFeedPage />} />
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
            <Route path="/library" element={<UserLibraryPage />} />
            <Route path="/history" element={<UserLibraryPage />} />
            <Route path="/network" element={<UserDashboardPage />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/settings" element={<UserSettingsPage />} />
            <Route path="/user/*" element={<UserDashboardPage />} />
          </Route>
        </Route>

        {/* 6. Admin Governance Suite (Role Protected) */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<EditorialReviewPage />} />
            <Route path="/admin/review" element={<EditorialReviewPage />} />
            <Route path="/admin/users" element={<UserManagementPage />} />
            <Route path="/admin/categories" element={<TaxonomyManagerPage />} />
            <Route path="/admin/tags" element={<TaxonomyManagerPage />} />
            <Route path="/admin/media" element={<MediaLibraryPage />} />
            <Route path="/admin/comments" element={<CommentsModerationPage />} />
            <Route path="/admin/audit" element={<AuditLogExplorerPage />} />
            <Route path="/admin/database" element={<DatabaseSwitcherPage />} />
            <Route path="/admin/*" element={<EditorialReviewPage />} />
          </Route>
        </Route>

        {/* 7. Dedicated 404 Catch-All Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
