import { useEffect, useState, useRef } from 'react';

/**
 * Enhanced proctoring hook with comprehensive tracking:
 * - Tab switching and window focus/blur detection
 * - Page visibility change detection
 * - Fullscreen exit detection
 * - Periodic heartbeat checks
 * - Keyboard shortcut blocking (Ctrl+C, Ctrl+V, etc.)
 * - All events logged silently to backend
 */
export const useEnhancedProctoring = (onViolation, interviewId) => {
  const [violations, setViolations] = useState([]);
  const violationRef = useRef(violations);
  const heartbeatIntervalRef = useRef(null);
  const lastHeartbeatRef = useRef(Date.now());
  const wasFullscreenRef = useRef(false);

  // Keep violations ref updated
  useEffect(() => {
    violationRef.current = violations;
  }, [violations]);

  useEffect(() => {
    if (!interviewId) return;

    let violationTimeout = null;
    let blurTimeout = null;

    // Track tab visibility changes (Page Visibility API)
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      
      if (!isVisible) {
        // Tab became hidden
        const violation = {
          type: 'TAB_SWITCH',
          timestamp: new Date().toISOString(),
          description: 'Tab switched or window lost focus'
        };
        
        setViolations(prev => [...prev, violation]);
        if (onViolation) {
          onViolation(violation);
        }
        
        if (violationTimeout) {
          clearTimeout(violationTimeout);
        }
      } else {
        // Tab became visible again - reset after delay
        violationTimeout = setTimeout(() => {
          // Tab is back, but violation already logged
        }, 500);
      }
    };

    // Track window blur/focus events
    const handleBlur = () => {
      blurTimeout = setTimeout(() => {
        if (document.hidden || document.activeElement === document.body) {
          const violation = {
            type: 'WINDOW_BLUR',
            timestamp: new Date().toISOString(),
            description: 'Window lost focus'
          };
          
          setViolations(prev => [...prev, violation]);
          if (onViolation) {
            onViolation(violation);
          }
        }
      }, 200);
    };

    const handleFocus = () => {
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };

    // Track fullscreen exit
    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || 
                              document.webkitFullscreenElement || 
                              document.mozFullScreenElement || 
                              document.msFullscreenElement);
      
      // If we were in fullscreen and now we're not, log violation
      if (wasFullscreenRef.current && !isFullscreen) {
        const violation = {
          type: 'FULLSCREEN_EXIT',
          timestamp: new Date().toISOString(),
          description: 'Exited fullscreen mode during interview'
        };
        
        setViolations(prev => [...prev, violation]);
        if (onViolation) {
          onViolation(violation);
        }
      }
      
      wasFullscreenRef.current = isFullscreen;
    };

    // Periodic heartbeat check (every 5 seconds)
    const startHeartbeat = () => {
      lastHeartbeatRef.current = Date.now();
      
      heartbeatIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;
        
        // If more than 10 seconds passed without update, candidate might have issues
        if (timeSinceLastHeartbeat > 10000) {
          const violation = {
            type: 'HEARTBEAT_MISSING',
            timestamp: new Date().toISOString(),
            description: 'Heartbeat check failed - possible tab/window inactivity'
          };
          
          setViolations(prev => [...prev, violation]);
          if (onViolation) {
            onViolation(violation);
          }
        }
        
        // Update heartbeat timestamp
        lastHeartbeatRef.current = Date.now();
        
        // Send heartbeat log (optional - can be used to verify candidate is active)
        if (onViolation && document.hidden === false) {
          // Silently log active session - no violation, just activity confirmation
        }
      }, 5000); // Check every 5 seconds
    };

    // Block keyboard shortcuts
    const handleKeyDown = (e) => {
      // Update heartbeat on any keyboard activity
      lastHeartbeatRef.current = Date.now();

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
          
          return false;
        }
      }
      
      // Block F12 and developer tools
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

    // Track mouse activity for heartbeat
    const handleMouseMove = () => {
      lastHeartbeatRef.current = Date.now();
    };

    // Initialize fullscreen state
    const checkFullscreenState = () => {
      wasFullscreenRef.current = !!(document.fullscreenElement || 
                                    document.webkitFullscreenElement || 
                                    document.mozFullScreenElement || 
                                    document.msFullscreenElement);
    };

    // Attach event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousemove', handleMouseMove);
    
    checkFullscreenState();
    startHeartbeat();

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousemove', handleMouseMove);
      
      if (violationTimeout) {
        clearTimeout(violationTimeout);
      }
      if (blurTimeout) {
        clearTimeout(blurTimeout);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [interviewId, onViolation]);

  return {
    violations
  };
};
