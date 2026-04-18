import { format, parseISO } from 'date-fns';

export const formatDate = (date, formatStr = 'dd-MM-yyyy') => {
  if (!date) return '-';
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    return '-';
  }
};

export const formatDateTime = (dateTime, formatStr = 'dd-MM-yyyy HH:mm') => {
  if (!dateTime) return '-';
  try {
    const dateObj = typeof dateTime === 'string' ? parseISO(dateTime) : dateTime;
    return format(dateObj, formatStr);
  } catch (error) {
    return '-';
  }
};

export const formatTime = (time) => {
  if (!time) return '-';
  try {
    if (typeof time === 'string') {
      return time.substring(0, 5); // HH:mm format
    }
    return time;
  } catch (error) {
    return '-';
  }
};

