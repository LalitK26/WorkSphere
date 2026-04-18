import { useEffect, useState, useRef } from 'react';

/**
 * Custom hook for proctoring features:
 * - Detects tab switching and window focus/blur
 * - Blocks copy-paste keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, etc.)
 * - Tracks violations
 */
export const useProctoring = (onViolation) => {
  const [isTabActive, setIsTabActive] = useState(true);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [violations, setViolations] = useState([]);
  const violationRef = useRef(violations);

  // Keep violations ref updated
  useEffect(() => {
    violationRef.current = violations;
  }, [violations]);

  // Track tab visibility changes (Page Visibility API)
  useEffect(() => {
    let lastVisibleTime = Date.now();
    let violationTimeout = null;

    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const now = Date.now();
      
      if (!isVisible) {
        // Tab became hidden - record violation immediately
        lastVisibleTime = now;
        
        const violation = {
          type: 'TAB_SWITCH',
          timestamp: new Date().toISOString(),
          description: 'Tab switched or window lost focus'
        };
        
        setViolations(prev => [...prev, violation]);
        setTabSwitchCount(prev => prev + 1);
        setIsTabActive(false);
        
        if (onViolation) {
          onViolation(violation);
        }
        
        // Clear any existing timeout
        if (violationTimeout) {
          clearTimeout(violationTimeout);
        }
      } else {
        // Tab became visible again
        // Only reset after a brief delay to avoid false positives from rapid switching
        violationTimeout = setTimeout(() => {
          setIsTabActive(true);
          lastVisibleTime = Date.now();
        }, 500);
      }
    };

    // Track window blur/focus events (additional detection)
    let blurTimeout = null;
    const handleBlur = () => {
      // Use a small delay to avoid false positives when clicking buttons
      blurTimeout = setTimeout(() => {
        // Double check if still blurred (not just a click)
        if (document.hidden || document.activeElement === document.body) {
          const violation = {
            type: 'WINDOW_BLUR',
            timestamp: new Date().toISOString(),
            description: 'Window lost focus'
          };
          
          setViolations(prev => [...prev, violation]);
          setIsTabActive(false);
          
          if (onViolation) {
            onViolation(violation);
          }
        }
      }, 200);
    };

    const handleFocus = () => {
      // Clear blur timeout if window regains focus quickly
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
      
      // Only set active if document is actually visible
      if (!document.hidden) {
        setIsTabActive(true);
      }
    };

    // Block keyboard shortcuts for copy, paste, cut, select all, etc.
    const handleKeyDown = (e) => {
      // Check for Ctrl/Cmd + C, V, X, A, S (Save), P (Print)
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl) {
        const key = e.key.toLowerCase();
        const blockedKeys = ['c', 'v', 'x', 'a', 's', 'p'];
        
        if (blockedKeys.includes(key)) {
          e.preventDefault();
          e.stopPropagation();
          
          const violation = {
            type: 'KEYBOARD_SHORTCUT',
            timestamp: new Date().toISOString(),
            description: `Blocked keyboard shortcut: Ctrl+${key.toUpperCase()}`
          };
          
          setViolations(prev => {
            const updated = [...prev, violation];
            violationRef.current = updated;
            return updated;
          });
          
          if (onViolation) {
            onViolation(violation);
          }
          
          // Don't show visual feedback to candidate - silent blocking
          // showWarning(`Copy-paste shortcuts are disabled during the interview`);
          
          return false;
        }
      }
      
      // Block F12 (Developer Tools), Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (View Source)
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j'].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.key.toLowerCase() === 'u')
      ) {
        e.preventDefault();
        e.stopPropagation();
        
        const violation = {
          type: 'DEV_TOOLS_ATTEMPT',
          timestamp: new Date().toISOString(),
          description: 'Attempted to open developer tools'
        };
        
        setViolations(prev => [...prev, violation]);
        
        if (onViolation) {
          onViolation(violation);
        }
        
        return false;
      }
    };

    // Block right-click context menu (optional, but can be enabled)
    const handleContextMenu = (e) => {
      // Uncomment the line below to block right-click
      // e.preventDefault();
    };

    // Prevent text selection shortcuts
    const handleSelectStart = (e) => {
      // Allow normal selection but track if needed
    };

    // Block drag and drop (prevent copying via drag)
    const handleDragStart = (e) => {
      // Uncomment to block drag operations
      // e.preventDefault();
    };

    // Show warning notification
    const showWarning = (message) => {
      // Create a temporary warning element
      const warning = document.createElement('div');
      warning.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fef3c7;
        border: 2px solid #f59e0b;
        color: #92400e;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        font-weight: 600;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
      `;
      warning.textContent = message;
      document.body.appendChild(warning);

      setTimeout(() => {
        warning.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
          if (document.body.contains(warning)) {
            document.body.removeChild(warning);
          }
        }, 300);
      }, 3000);
    };

    // Add CSS for animations if not already present
    if (!document.getElementById('proctoring-styles')) {
      const style = document.createElement('style');
      style.id = 'proctoring-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Attach event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      
      // Clear any pending timeouts
      if (violationTimeout) {
        clearTimeout(violationTimeout);
      }
      if (blurTimeout) {
        clearTimeout(blurTimeout);
      }
    };
  }, [isTabActive, onViolation]);

  return {
    isTabActive,
    tabSwitchCount,
    violations
  };
};
