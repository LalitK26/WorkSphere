
import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { FiUser, FiShield, FiX } from 'react-icons/fi';


const SettingsSidebar = ({ onClose }) => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const { isSettingsSidebarOpen, closeSettingsSidebar } = useSidebar();
  const [searchTerm, setSearchTerm] = useState('');
  
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Auto-open settings sidebar when navigating to settings pages on desktop
  useEffect(() => {
    if (location.pathname.startsWith('/settings/') && window.innerWidth >= 1024) {
      // Settings sidebar should be visible on desktop
    }
  }, [location.pathname]);

  // Close settings sidebar on route change for mobile
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      if (window.innerWidth < 1024 && isSettingsSidebarOpen) {
        // Close after a short delay to allow navigation
        const timer = setTimeout(() => {
          closeSettingsSidebar();
        }, 100);
        prevPathnameRef.current = location.pathname;
        return () => clearTimeout(timer);
      }
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname, isSettingsSidebarOpen, closeSettingsSidebar]);

  const handleLinkClick = () => {
    // Close sidebar on mobile when link is clicked
    if (window.innerWidth < 1024) {
      closeSettingsSidebar();
    }
  };



  // const menuItems = [
  //   ...(isAdmin()
  //     ? [{ path: '/settings/roles', label: 'Roles & Permissions', icon: '🔐' }]
  //     : []),
  //   { path: '/settings/profile', label: 'Profile Settings', icon: '👤' },
  // ];

  const menuItems = [
    ...(isAdmin()
      ? [{ path: '/settings/roles', label: 'Roles & Permissions', icon: FiShield }]
      : []),
    { path: '/settings/profile', label: 'Profile Settings', icon: FiUser },
  ];


  const filteredItems = menuItems.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <style>{`
        .settings-sidebar-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .settings-sidebar-scroll::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 4px;
        }
        .settings-sidebar-scroll::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.5);
          border-radius: 4px;
          transition: background 0.2s ease;
        }
        .settings-sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.8);
        }
        .settings-sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(156, 163, 175, 0.5) rgba(31, 41, 55, 0.5);
        }
      `}</style>
      {/* Overlay for mobile */}
      {isSettingsSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[55] lg:hidden"
          onClick={closeSettingsSidebar}
        />
      )}
      <aside 
        className={`
          fixed top-0 w-64 bg-gray-800 text-white h-screen flex flex-col overflow-hidden border-l border-gray-700 z-[60]
          transform transition-transform duration-300 ease-in-out
          ${isSettingsSidebarOpen || (location.pathname.startsWith('/settings/') && typeof window !== 'undefined' && window.innerWidth >= 1024) ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:left-64
        `}
      >
        <div className="p-4 flex-shrink-0 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Settings</h3>
            <button
              onClick={closeSettingsSidebar}
              className="lg:hidden p-1 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-label="Close settings"
            >
              <FiX className="w-5 h-5" />
            </button>
            {onClose && window.innerWidth >= 1024 && (
              <button
                onClick={onClose}
                className="hidden lg:block text-gray-400 hover:text-white transition-colors"
                aria-label="Close settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 pl-8 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-2 top-2.5 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto settings-sidebar-scroll pb-6">
          <div className="px-4 pt-4 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No settings found</div>
            ) : (
              filteredItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors rounded ${isActive(item.path)
                    ? 'bg-gray-900 text-white border-l-4 border-blue-500'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                >
                  {/* {item.icon && <span className="mr-3">{item.icon}</span>} */}
                  {item.icon && <item.icon className="w-5 h-5 mr-3" />}

                  {item.label}
                </Link>
              ))
            )}
          </div>
        </nav>
      </aside>
    </>
  );
};

export default SettingsSidebar;

