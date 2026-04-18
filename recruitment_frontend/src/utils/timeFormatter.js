/**
 * Format timestamp to IST (Indian Standard Time) timezone
 * @param {string|Date} timestamp - ISO string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted time string in IST
 */
export const formatToIST = (timestamp, options = {}) => {
  if (!timestamp) return '-';
  
  try {
    let date;
    
    // Handle different timestamp formats from backend
    if (typeof timestamp === 'string') {
      const trimmed = timestamp.trim();
      // Check if timestamp matches LocalDateTime pattern (YYYY-MM-DDTHH:mm:ss) without timezone
      // Pattern: "2026-01-21T02:12:48" - no Z, no +/- timezone offset
      const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
      
      if (localDateTimePattern.test(trimmed)) {
        // Timestamp format from Java LocalDateTime - treat as UTC and convert to IST
        date = new Date(trimmed + 'Z'); // Append 'Z' to indicate UTC
      } else {
        date = new Date(timestamp);
      }
    } else {
      date = new Date(timestamp);
    }
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', timestamp);
      return '-';
    }
    
    // Format to IST timezone (Asia/Kolkata)
    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      ...options
    });
  } catch (error) {
    console.error('Error formatting timestamp to IST:', error, timestamp);
    return '-';
  }
};

/**
 * Format timestamp to IST with date and time
 * @param {string|Date} timestamp - ISO string or Date object
 * @returns {string} Formatted date-time string in IST
 */
export const formatDateTimeIST = (timestamp) => {
  if (!timestamp) return '-';
  
  try {
    let date;
    
    // Handle different timestamp formats from backend
    if (typeof timestamp === 'string') {
      const trimmed = timestamp.trim();
      // Check if timestamp matches LocalDateTime pattern (YYYY-MM-DDTHH:mm:ss) without timezone
      // Pattern: "2026-01-21T02:12:48" - no Z, no +/- timezone offset
      const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;
      
      if (localDateTimePattern.test(trimmed)) {
        // Timestamp format from Java LocalDateTime - treat as UTC and convert to IST
        date = new Date(trimmed + 'Z'); // Append 'Z' to indicate UTC
      } else {
        date = new Date(timestamp);
      }
    } else {
      date = new Date(timestamp);
    }
    
    // Validate date
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', timestamp);
      return '-';
    }
    
    // Format to IST timezone (Asia/Kolkata)
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting date-time to IST:', error, timestamp);
    return '-';
  }
};
