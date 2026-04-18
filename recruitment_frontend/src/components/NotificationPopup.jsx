import { useEffect, useState } from 'react';
import { FiBell } from 'react-icons/fi';

const DURATION_MS = 5000;

/**
 * Non-blocking top-right notification popup.
 * Auto-dismisses after ~5s. Shows progress bar. Click navigates to Notifications page.
 * Professional icon (FiBell). No emojis.
 */
const NotificationPopup = ({ notification, onDismiss, onClick }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!notification) return;
    setProgress(100);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);
    const timer = setTimeout(() => {
      clearInterval(interval);
      onDismiss();
    }, DURATION_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when notification changes
  }, [notification?.id]);

  if (!notification) return null;

  const title = notification?.title ?? 'Notification';
  const message = notification?.message ?? '';

  return (
    <button
      type="button"
      onClick={() => {
        onDismiss();
        onClick?.();
      }}
      className="fixed top-4 right-4 z-[60] flex flex-col min-w-[300px] max-w-md rounded-lg shadow-lg border border-gray-200 bg-white text-left overflow-hidden animate-slide-in-right focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      role="alert"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <FiBell className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{title}</p>
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{message}</p>
        </div>
      </div>
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-blue-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
      `}</style>
    </button>
  );
};

export default NotificationPopup;
