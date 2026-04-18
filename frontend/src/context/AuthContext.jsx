import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authService } from '../api/authService';
import { useTabCloseLogout } from '../hooks/useTabCloseLogout';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Validate session with server on startup
    const validateAndLoadSession = async () => {
      try {
        // First, check if we have a token
        const token = authService.getToken();
        if (!token) {
          // No token, definitely not authenticated
          setLoading(false);
          return;
        }

        // Load user from localStorage first (optimistic load)
        const storedUser = authService.getCurrentUser();
        if (storedUser) {
          setUser(storedUser);
        }

        // Load permissions from localStorage first as fallback
        const storedPermissions = localStorage.getItem('permissions');
        if (storedPermissions) {
          try {
            const parsedPermissions = JSON.parse(storedPermissions);
            setPermissions(parsedPermissions);
          } catch (e) {
            // Invalid stored permissions, ignore
          }
        }

        // Validate token with server
        const isValidSession = await authService.validateSession();
        
        if (isValidSession) {
          // Session is valid, ensure user is loaded and refresh permissions
          if (!storedUser) {
            // User data missing, clear session
            authService.logout();
            setLoading(false);
            return;
          }
          await loadPermissions();
        } else {
          // Session validation failed - check if token still exists
          // If token was cleared by validateSession, user is logged out
          // If token still exists, it might be a network error, so keep user logged in
          const tokenStillExists = authService.getToken();
          if (!tokenStillExists) {
            // Token was cleared, user is logged out
            setUser(null);
            setPermissions(null);
          }
          // If token still exists, keep the user logged in (optimistic)
          // Permissions are already loaded from localStorage above
        }
      } catch (error) {
        // On error, try to restore from localStorage
        const token = authService.getToken();
        if (token) {
          // Token exists, restore user from localStorage
          const storedUser = authService.getCurrentUser();
          if (storedUser) {
            setUser(storedUser);
          }
          // Try to restore permissions
          const storedPermissions = localStorage.getItem('permissions');
          if (storedPermissions) {
            try {
              const parsedPermissions = JSON.parse(storedPermissions);
              setPermissions(parsedPermissions);
            } catch (e) {
              // Invalid stored permissions, ignore
            }
          }
        } else {
          // No token, user is logged out
          setUser(null);
          setPermissions(null);
        }
      } finally {
        setLoading(false);
      }
    };

    validateAndLoadSession();
  }, []);

  const loadPermissions = async () => {
    try {
      // Clear old permissions first to avoid stale data
      const permissionsData = await authService.getCurrentUserPermissions();
      if (permissionsData) {
        setPermissions(permissionsData);
        localStorage.setItem('permissions', JSON.stringify(permissionsData));
      } else {
        // If server returns null, clear any stale permissions
        setPermissions(null);
        localStorage.removeItem('permissions');
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      // On error, clear stale permissions to force fresh load on next attempt
      setPermissions(null);
      localStorage.removeItem('permissions');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      const userData = {
        userId: response.userId,
        email: response.email,
        role: response.role,
        fullName: response.fullName,
      };
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      // Load permissions in background (non-blocking) for faster login
      loadPermissions().catch(() => {
        // Silently fail - permissions will be loaded when needed
      });
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = useCallback(() => {
    authService.logout(false);
    setUser(null);
    setPermissions(null);
  }, []);

  // Handle logout on tab/window close
  const handleTabCloseLogout = useCallback(() => {
    // Don't logout on page refresh - only on actual tab close
    // The useTabCloseLogout hook should handle this, but add extra safety
    if (document.visibilityState === 'visible') {
      // Page is still visible, might be a refresh
      return;
    }
    // Clear client-side session state on tab close
    authService.logout(true); // Pass true to indicate tab close
    // Note: We don't update state here because the component is unmounting
    // The state will be cleared via localStorage removal
  }, []);

  // Set up tab close detection
  useTabCloseLogout(user ? handleTabCloseLogout : null);

  const isAdmin = () => {
    return user?.role === 'ADMIN';
  };

  const isEmployee = () => {
    return user?.role === 'EMPLOYEE';
  };

  // Check if user has permission to view a module
  const hasModulePermission = (moduleName, action = 'view') => {
    // Admin always has all permissions
    if (isAdmin()) {
      return true;
    }

    if (!permissions || !permissions.permissions) {
      return false;
    }

    const modulePermission = permissions.permissions.find(
      (p) => p.module === moduleName
    );

    if (!modulePermission) {
      return false;
    }

    const permissionValue = modulePermission[action.toLowerCase()];
    
    // If permission is "All", user has access
    if (permissionValue === 'All') {
      return true;
    }

    // If permission is "None", user doesn't have access
    if (permissionValue === 'None') {
      return false;
    }

    // For other values (Added, Owned, Added & Owned), user has some level of access
    // We'll show the module, but actual data filtering will happen at API level
    return true;
  };

  // Check if user has full permissions (all actions set to "All") for a module
  const hasFullModulePermission = (moduleName) => {
    // Admin always has all permissions
    if (isAdmin()) {
      return true;
    }

    if (!permissions || !permissions.permissions) {
      return false;
    }

    const modulePermission = permissions.permissions.find(
      (p) => p.module === moduleName
    );

    if (!modulePermission) {
      return false;
    }

    // Check if all four permissions (add, view, update, delete) are set to "All"
    return (
      modulePermission.add === 'All' &&
      modulePermission.view === 'All' &&
      modulePermission.update === 'All' &&
      modulePermission.delete === 'All'
    );
  };

  // Get the permission value for a specific module and action
  const getModulePermission = (moduleName, action = 'view') => {
    if (!permissions || !permissions.permissions) {
      // If no permissions loaded, check if admin (fallback)
      return isAdmin() ? 'All' : 'None';
    }

    const modulePermission = permissions.permissions.find(
      (p) => p.module === moduleName
    );

    if (!modulePermission) {
      // If no permission found for module, check if admin (fallback)
      return isAdmin() ? 'All' : 'None';
    }

    const permissionValue = modulePermission[action.toLowerCase()] || 'None';
    
    // Use the actual permission value from the role
    // This ensures that even admin users with specific role assignments
    // (with "Added", "Owned", or "Added and Owned" permissions) see employee UI
    // Only return 'All' if permission is explicitly 'All' or if no permission is set and user is admin
    if (permissionValue !== 'None') {
      return permissionValue;
    }
    
    // Fallback: if permission is 'None' but user is admin, return 'All'
    return isAdmin() ? 'All' : 'None';
  };

  const value = {
    user,
    permissions,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin,
    isEmployee,
    hasModulePermission,
    hasFullModulePermission,
    getModulePermission,
    loadPermissions,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

