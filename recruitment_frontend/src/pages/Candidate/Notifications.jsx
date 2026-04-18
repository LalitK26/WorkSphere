import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiBell,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiInfo,
  FiClock,
  FiXCircle
} from 'react-icons/fi';
import { getNotifications, markAsRead, NOTIFICATIONS_CHANGED } from '../../utils/notificationStorage';
import { formatDateTimeIST } from '../../utils/timeFormatter';

/**
 * Helper to determine icon and color style based on notification content.
 */
const getNotificationStyle = (title = '') => {
  const lowerTitle = title.toLowerCase();

  if (lowerTitle.includes('offer')) {
    return {
      icon: FiBriefcase,
      colorClass: 'text-green-600 bg-green-100',
      borderClass: 'border-l-green-500'
    };
  }
  if (lowerTitle.includes('interview')) {
    return {
      icon: FiCalendar,
      colorClass: 'text-purple-600 bg-purple-100',
      borderClass: 'border-l-purple-500'
    };
  }
  if (lowerTitle.includes('reject') || lowerTitle.includes('cancel')) {
    return {
      icon: FiXCircle,
      colorClass: 'text-red-600 bg-red-100',
      borderClass: 'border-l-red-500'
    };
  }
  if (lowerTitle.includes('accept') || lowerTitle.includes('success')) {
    return {
      icon: FiCheckCircle,
      colorClass: 'text-emerald-600 bg-emerald-100',
      borderClass: 'border-l-emerald-500'
    };
  }
  if (lowerTitle.includes('application')) {
    return {
      icon: FiInfo,
      colorClass: 'text-blue-600 bg-blue-100',
      borderClass: 'border-l-blue-500'
    };
  }

  // Default
  return {
    icon: FiBell,
    colorClass: 'text-gray-600 bg-gray-100',
    borderClass: 'border-l-gray-400'
  };
};

const Notifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.userId ?? null;
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const load = () => {
      try {
        const list = getNotifications(userId);
        setNotifications(Array.isArray(list) ? list : []);
      } catch (_) {
        setNotifications([]);
      }
    };
    load();
    const handler = () => load();
    window.addEventListener(NOTIFICATIONS_CHANGED, handler);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, handler);
  }, [userId]);

  const handleClick = (n) => {
    if (!n?.id) return;
    try {
      markAsRead(userId, n.id);
      if (n.redirectPath && typeof n.redirectPath === 'string' && n.redirectPath.trim()) {
        navigate(n.redirectPath.trim());
      }
    } catch (_) { }
  };

  const sorted = [...(notifications || [])].sort((a, b) => {
    const tA = a?.createdAt ?? '';
    const tB = b?.createdAt ?? '';
    return tB.localeCompare(tA);
  });

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg shadow-sm mt-0.5">
              <FiBell className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Notifications</h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5 sm:mt-1">
                Stay updated with your recruitment progress
              </p>
            </div>
          </div>
          {sorted.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-semibold">{sorted.length}</span>
              <span>{sorted.length === 1 ? 'Notification' : 'Notifications'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {!Array.isArray(sorted) || sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center animate-fade-in">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <FiBell className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Caught Up!</h3>
            <p className="text-gray-500 max-w-sm">
              You have no new notifications. We'll alert you here when there are updates on your applications.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((n, idx) => {
              const { icon: Icon, colorClass, borderClass } = getNotificationStyle(n?.title);
              const isUnread = !n?.isRead;

              return (
                <div
                  key={n?.id ?? `n-fallback-${idx}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleClick(n)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick(n)}
                  className={`
                    group relative bg-white rounded-xl p-5 border transition-all duration-200 ease-in-out
                    hover:shadow-md hover:border-blue-200 cursor-pointer
                    ${isUnread ? 'border-l-4 ' + borderClass : 'border-gray-200 opacity-90 hover:opacity-100'}
                  `}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`
                      flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center 
                      ${colorClass} group-hover:scale-110 transition-transform duration-200
                    `}>
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className={`text-base font-semibold ${isUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                          {n?.title ?? 'Notification'}
                        </h4>
                        {n?.createdAt && (
                          <span className="flex items-center text-xs text-gray-400 whitespace-nowrap pt-1">
                            <FiClock className="w-3 h-3 mr-1" />
                            {formatDateTimeIST(n.createdAt)}
                          </span>
                        )}
                      </div>

                      <p className={`mt-1 text-sm leading-relaxed ${isUnread ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                        {n?.message ?? ''}
                      </p>

                      {isUnread && (
                        <div className="absolute top-5 right-5 w-2 h-2 bg-blue-500 rounded-full animate-pulse md:hidden" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Notifications;
