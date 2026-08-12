import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AdminRoute: React.FC = () => {
  const { isAuthenticated, isLoading, hasCheckedAuth, checkAuth, hasRole } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!hasCheckedAuth) {
      checkAuth();
    }
  }, [hasCheckedAuth, checkAuth]);

  if (isLoading && !hasCheckedAuth) {
    return <LoadingSpinner fullPage label="Verifying administrative credentials..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isStaff = hasRole(['super_admin', 'admin', 'editor']);
  if (!isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
