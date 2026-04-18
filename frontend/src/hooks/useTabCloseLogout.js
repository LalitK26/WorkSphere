import { useEffect, useRef } from 'react';

/**
 * Hook to detect when the browser tab/window is closed (not just navigating or refreshing)
 * and trigger logout only on actual close events.
 * 
 * Uses a combination of events to reliably distinguish:
 * - Tab/window close from normal navigation
 * - Tab/window close from page refresh/reload
 * - Works across Chrome, Firefox, Edge (desktop & mobile)
 */
export const useTabCloseLogout = (onLogout) => {
  const isNavigatingRef = useRef(false);
  const logoutCalledRef = useRef(false);
  const navigationTimeoutRef = useRef(null);

  // Helper to detect if this is a page refresh
  // Uses sessionStorage to track refresh attempts
  const isPageRefresh = () => {
    // Check if we marked this as a refresh
    return sessionStorage.getItem('_pageRefresh') === 'true';
  };

  // Mark that a refresh is happening
  const markPageRefresh = () => {
    // Store current URL and timestamp to help detect refresh
    sessionStorage.setItem('_pageRefresh', 'true');
    sessionStorage.setItem('_pageUrl', window.location.href);
    sessionStorage.setItem('_pageTimestamp', Date.now().toString());
  };

  // Clear refresh flag (called on page load)
  const clearPageRefreshFlag = () => {
    // Check if this page load was a refresh
    try {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        if (navEntry.type === 'reload') {
          // This page was loaded via refresh, so previous page was refreshed
          // Clear all refresh-related flags
          sessionStorage.removeItem('_pageRefresh');
          sessionStorage.removeItem('_pageUrl');
          sessionStorage.removeItem('_pageTimestamp');
          // Keep _currentPageIsReload to help detect next refresh
          return;
        }
      }
    } catch (e) {
      // Try deprecated API
      try {
        if (performance.navigation && performance.navigation.type === 1) {
          sessionStorage.removeItem('_pageRefresh');
          sessionStorage.removeItem('_pageUrl');
          sessionStorage.removeItem('_pageTimestamp');
          return;
        }
      } catch (e2) {
        // Can't determine
      }
    }

    // If not a refresh, clear all refresh-related flags
    sessionStorage.removeItem('_pageRefresh');
    sessionStorage.removeItem('_pageUrl');
    sessionStorage.removeItem('_pageTimestamp');
    sessionStorage.removeItem('_currentPageIsReload');
  };

  useEffect(() => {
    if (!onLogout) return;

    // Clear refresh flag on mount (in case it was set from previous page)
    clearPageRefreshFlag();

    // Check if this page was loaded via refresh - if so, mark it
    // This helps us detect subsequent refreshes
    try {
      const navigationEntries = performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const navEntry = navigationEntries[0];
        if (navEntry.type === 'reload') {
          // This page was loaded via refresh, so mark it
          sessionStorage.setItem('_currentPageIsReload', 'true');
        }
      }
    } catch (e) {
      // Try deprecated API
      try {
        if (performance.navigation && performance.navigation.type === 1) {
          sessionStorage.setItem('_currentPageIsReload', 'true');
        }
      } catch (e2) {
        // Can't determine
      }
    }

    const clearNavigationFlag = () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      navigationTimeoutRef.current = setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500); // Give navigation time to complete
    };

    const setNavigationFlag = () => {
      isNavigatingRef.current = true;
      clearNavigationFlag();
    };

    // Detect actual tab/window close using pagehide (most reliable)
    const handlePageHide = (event) => {
      // If page is being cached (back/forward navigation), don't logout
      if (event.persisted) {
        return;
      }

      // If we're navigating, don't logout
      if (isNavigatingRef.current) {
        return;
      }

      // Check if this is a page refresh - if so, don't logout
      if (isPageRefresh()) {
        return;
      }

      // Key check: If current page was loaded via refresh, 
      // and we're unloading without navigation, it's likely another refresh
      const currentPageIsReload = sessionStorage.getItem('_currentPageIsReload') === 'true';
      if (currentPageIsReload) {
        // Current page was loaded via refresh, so unloading is likely another refresh
        markPageRefresh();
        return;
      }

      // This is likely a real close
      if (!logoutCalledRef.current) {
        logoutCalledRef.current = true;
        onLogout();
      }
    };

    // Detect refresh attempts in beforeunload
    // This fires before pagehide, so we can mark refresh attempts early
    const handleBeforeUnload = (event) => {
      // If we're navigating, don't logout
      if (isNavigatingRef.current) {
        return;
      }

      // Key check: If current page was loaded via refresh, 
      // unloading is likely another refresh
      const currentPageIsReload = sessionStorage.getItem('_currentPageIsReload') === 'true';
      if (currentPageIsReload) {
        // Mark as refresh immediately
        markPageRefresh();
        return;
      }

      // Only proceed if pagehide hasn't already been called
      // (pagehide is more reliable, so we prefer it)
      if (!logoutCalledRef.current && document.visibilityState === 'hidden') {
        // Use a small delay to let pagehide fire first if it's going to
        setTimeout(() => {
          if (!logoutCalledRef.current && !isPageRefresh()) {
            logoutCalledRef.current = true;
            onLogout();
          }
        }, 0);
      }
    };

    // Track React Router navigation via history API
    const handlePopState = () => {
      setNavigationFlag();
    };

    // Track link clicks (internal navigation)
    const handleClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.href) {
        try {
          const url = new URL(target.href, window.location.origin);
          // Only track internal navigation (same origin)
          if (url.origin === window.location.origin && !target.target) {
            setNavigationFlag();
          }
        } catch (e) {
          // Invalid URL, ignore
        }
      }
    };

    // Track form submissions that might navigate
    const handleSubmit = (e) => {
      const form = e.target.closest('form');
      if (form && !form.target) {
        setNavigationFlag();
      }
    };

    // Override history methods to track programmatic navigation
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      setNavigationFlag();
      return originalPushState.apply(history, args);
    };

    history.replaceState = function(...args) {
      setNavigationFlag();
      return originalReplaceState.apply(history, args);
    };

    // Add event listeners
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick, true); // Use capture phase
    document.addEventListener('submit', handleSubmit, true);

    // Cleanup
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('submit', handleSubmit, true);
      
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      
      // Restore original history methods
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [onLogout]);
};

