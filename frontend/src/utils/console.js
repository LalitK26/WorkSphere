/**
 * Console utility - Disables console logs in production
 * This prevents sensitive information from being exposed in production builds
 */

const isProduction = import.meta.env.VITE_APP_ENV === 'production' || 
                     import.meta.env.MODE === 'production' ||
                     !import.meta.env.DEV;

if (isProduction) {
  // Override console methods to prevent logging in production
  const noop = () => {};
  
  // Store original console methods (in case we need them for debugging)
  window.__originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    trace: console.trace,
    table: console.table,
    group: console.group,
    groupEnd: console.groupEnd,
    groupCollapsed: console.groupCollapsed,
    time: console.time,
    timeEnd: console.timeEnd,
    count: console.count,
    clear: console.clear
  };

  // Disable all console methods in production
  console.log = noop;
  console.error = noop;
  console.warn = noop;
  console.info = noop;
  console.debug = noop;
  console.trace = noop;
  console.table = noop;
  console.group = noop;
  console.groupEnd = noop;
  console.groupCollapsed = noop;
  console.time = noop;
  console.timeEnd = noop;
  console.count = noop;
  console.clear = noop;

  // Keep console.error for critical errors but sanitize output
  console.error = (...args) => {
    // Only log if it's a critical error, and sanitize any sensitive data
    const sanitized = args.map(arg => {
      if (typeof arg === 'string') {
        // Remove potential sensitive patterns
        return arg
          .replace(/token['"]?\s*[:=]\s*['"]?[^'"]+/gi, 'token: [REDACTED]')
          .replace(/password['"]?\s*[:=]\s*['"]?[^'"]+/gi, 'password: [REDACTED]')
          .replace(/authorization['"]?\s*[:=]\s*['"]?[^'"]+/gi, 'authorization: [REDACTED]')
          .replace(/bearer\s+[^\s]+/gi, 'bearer [REDACTED]');
      }
      return arg;
    });
    window.__originalConsole.error(...sanitized);
  };
}

export default {};

