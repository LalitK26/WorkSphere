import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { FiX } from 'react-icons/fi';
import {
  FiHome,
  FiGrid,
  FiBarChart2,
  FiCalendar,
  FiFolder,
  FiCheckSquare,
  FiClock,
  FiTag,
  FiUsers,
  FiLayers,
  FiAward,
  FiGift,
  FiSettings,
  FiFileText,
  FiBriefcase,
  FiCreditCard
} from 'react-icons/fi';
import logo from '../../assets/white_logo_horizontal.png';

const Sidebar = () => {
  const location = useLocation();
  const { isAdmin, hasModulePermission, hasFullModulePermission } = useAuth();
  const { isSidebarOpen, closeSidebar, toggleSettingsSidebar } = useSidebar();
  const [expandedMenus, setExpandedMenus] = useState({});

  // Close sidebar when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        closeSidebar();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [closeSidebar]);

  // Close sidebar on route change for mobile (but not on initial mount)
  const prevPathnameRef = useRef(location.pathname);
  useEffect(() => {
    // Only close if pathname actually changed (not on initial mount)
    if (prevPathnameRef.current !== location.pathname) {
      if (window.innerWidth < 1024 && isSidebarOpen) {
        closeSidebar();
      }
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname, isSidebarOpen, closeSidebar]);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const dashboardChildren = [
    { path: '/dashboard/private', label: 'Private Dashboard', icon: <FiGrid className="w-4 h-4" /> },
    ...(!isAdmin() ? [{ path: '/dashboard/id-card', label: 'My ID Card', icon: <FiCreditCard className="w-4 h-4" /> }] : []),
    ...(isAdmin()
      ? [{ path: '/dashboard/advanced', label: 'Advanced Dashboard', icon: <FiBarChart2 className="w-4 h-4" /> }]
      : []),
  ];

  // Helper function to check if menu item should be shown
  const shouldShowMenuItem = (item) => {
    // Always show Dashboard, Calendar, and Settings
    if (item.path === '/calendar' || item.path === '/settings/profile' || item.label === 'Dashboard') {
      return true;
    }

    // If hasModulePermission is not available yet, show by default (will be filtered after permissions load)
    if (!hasModulePermission) {
      return true;
    }

    // Map paths to module names for permission checking
    const moduleMap = {
      '/work/projects': 'Projects',
      '/work/tasks': 'Tasks',
      '/attendance': 'Attendance',
      '/tickets': 'Tickets',
      '/leaves': 'Leaves',
      '/events': 'Events',
      '/employees': 'Employees',
      '/hr/departments': 'Department',
      '/hr/designations': 'Designations',
      '/hr/shift-roster': 'Shift Roster',
      '/hr/holidays': 'Holidays',
    };

    const moduleName = moduleMap[item.path];
    if (!moduleName) {
      return true; // Show by default if not mapped
    }

    // For all modules, check if user has view permission (not "None")
    // This allows access for "All", "Added", "Owned", "Added & Owned"
    return hasModulePermission(moduleName, 'view');
  };

  const menuItems = [
    { label: 'Dashboard', icon: <FiHome className="w-5 h-5" />, children: dashboardChildren },
    { path: '/calendar', label: 'My Calendar', icon: <FiCalendar className="w-5 h-5" /> },
    ...(shouldShowMenuItem({ path: '/work/projects' }) ? [{ path: '/work/projects', label: 'Projects', icon: <FiFolder className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/work/tasks' }) ? [{ path: '/work/tasks', label: 'Tasks', icon: <FiCheckSquare className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/attendance' }) ? [{ path: '/attendance', label: 'Attendance', icon: <FiClock className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/tickets' }) ? [{ path: '/tickets', label: 'Tickets', icon: <FiTag className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/leaves' }) ? [{ path: '/leaves', label: 'Leaves', icon: <FiFileText className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/events' }) ? [{ path: '/events', label: 'Events', icon: <FiCalendar className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/employees' }) ? [{ path: '/employees', label: 'Employees', icon: <FiUsers className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/hr/departments' }) ? [{ path: '/hr/departments', label: 'Department', icon: <FiLayers className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/hr/designations' }) ? [{ path: '/hr/designations', label: 'Designations', icon: <FiAward className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/hr/shift-roster' }) ? [{ path: '/hr/shift-roster', label: 'Shift Roster', icon: <FiCalendar className="w-5 h-5" /> }] : []),
    ...(shouldShowMenuItem({ path: '/hr/holidays' }) ? [{ path: '/hr/holidays', label: 'Holiday', icon: <FiGift className="w-5 h-5" /> }] : []),
    { path: '/settings/profile', label: 'Settings', icon: <FiSettings className="w-5 h-5" /> },
  ].filter(Boolean);

  const isMenuOpen = (item) => {
    if (!item.children) return false;
    if (typeof expandedMenus[item.label] === 'boolean') {
      return expandedMenus[item.label];
    }
    return item.children.some((child) => isActive(child.path));
  };

  const toggleMenu = (item) => {
    if (!item.children) return;
    setExpandedMenus((prev) => {
      const current = prev[item.label];
      const defaultState = item.children.some((child) => isActive(child.path));
      return {
        ...prev,
        [item.label]: !(typeof current === 'boolean' ? current : defaultState),
      };
    });
  }


  const handleLinkClick = (path) => {
    // Close sidebar on mobile when link is clicked
    if (window.innerWidth < 1024) {
      closeSidebar();
    }
    // If clicking Settings, open settings sidebar on mobile
    if (path === '/settings/profile' && window.innerWidth < 1024) {
      setTimeout(() => {
        toggleSettingsSidebar();
      }, 300); // Wait for main sidebar to close
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      <aside 
        className={`fixed left-0 top-0 w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white h-screen flex flex-col overflow-hidden z-[60] transform transition-all duration-300 ease-in-out shadow-[4px_0_24px_-2px_rgba(0,0,0,0.3)] ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Brand Section */}
        <div className="flex items-center justify-between px-3 py-3 flex-shrink-0 border-b border-slate-700/30 bg-gradient-to-r from-slate-800/50 to-transparent">
          <div className="flex items-center flex-1">
            <img 
              src={logo} 
              alt="WorkSphere Logo" 
              className="h-14 w-full max-w-[180px] object-contain" 
            />
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            aria-label="Close sidebar"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 space-y-1 flex-1 overflow-y-auto sidebar-scrollbar pb-6 px-2">
          {menuItems.slice(0, -1).map((item) => {
            if (item.children) {
              const open = isMenuOpen(item);
              const isChildActive = item.children.some((child) => isActive(child.path));
              return (
                <div key={item.label} className="mb-1">
                  <button
                    type="button"
                    onClick={() => toggleMenu(item)}
                    className={`relative flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${isChildActive
                      ? 'bg-blue-500/20 text-white'
                      : 'text-slate-400 hover:bg-slate-700/40 hover:text-white'
                      }`}
                  >
                    {isChildActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full" />
                    )}
                    <span className="flex items-center">
                      {item.icon && <span className="mr-3">{item.icon}</span>}
                      {item.label}
                    </span>
                    <span className={`transform transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>›</span>
                  </button>
                  {open && (
                    <div className="ml-4 mt-1 border-l border-slate-700/50 pl-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => handleLinkClick(child.path)}
                          className={`relative flex items-center pl-4 pr-4 py-2.5 text-sm rounded-lg transition-all duration-200 ${isActive(child.path)
                            ? 'bg-blue-500/15 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/30'
                            }`}
                        >
                          {isActive(child.path) && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-blue-500 rounded-full" />
                          )}
                          {child.icon && <span className="mr-3">{child.icon}</span>}
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleLinkClick(item.path)}
                className={`relative flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${isActive(item.path)
                  ? 'bg-blue-500/20 text-white'
                  : 'text-slate-400 hover:bg-slate-700/40 hover:text-white'
                  }`}
              >
                {isActive(item.path) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full" />
                )}
                {item.icon && <span className="mr-3">{item.icon}</span>}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer - Settings */}
        <div className="border-t border-slate-700/30 bg-slate-800/50 pt-2 pb-2 px-2">
          {menuItems.slice(-1).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => handleLinkClick(item.path)}
              className={`relative flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-lg ${isActive(item.path)
                ? 'bg-blue-500/20 text-white'
                : 'text-slate-400 hover:bg-slate-700/40 hover:text-white'
                }`}
            >
              {isActive(item.path) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-blue-600 rounded-r-full" />
              )}
              {item.icon && <span className="mr-3">{item.icon}</span>}
              {item.label}
            </Link>
          ))}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

