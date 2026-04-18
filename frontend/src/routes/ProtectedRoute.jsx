import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, requireAdmin = false, requireModulePermission = null }) => {
  const { isAuthenticated, isAdmin, hasModulePermission, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/dashboard/private" replace />;
  }

  // Check module permission requirement - allow if view permission is not "None"
  if (requireModulePermission) {
    if (!hasModulePermission) {
      // Permissions not loaded yet, wait
      return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
    }
    // Allow access if user has any view permission (All, Added, Owned, Added & Owned)
    if (!hasModulePermission(requireModulePermission, 'view')) {
      return <Navigate to="/dashboard/private" replace />;
    }
  }

  return children;
};

