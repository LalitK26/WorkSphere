import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  LogOut,
  User,
  FileText,
  Briefcase,
  Calendar,
  FileCheck,
  Bell,
  Settings,
  ChevronDown,
  Mail,
  Grid3x3,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import logo from '../assets/white_logo_horizontal.png';
import NotificationPopup from './NotificationPopup';
import ConfirmationModal from './ConfirmationModal';
import {
  getNotifications,
  NOTIFICATIONS_CHANGED,
  NOTIFICATION_ADDED,
} from '../utils/notificationStorage';

const Layout = () => {
  const { user, logout, isRecruitmentAdmin, isAdminOrRecruiter, isCandidate, isTechnicalInterviewer } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isInterviewDropdownOpen, setIsInterviewDropdownOpen] = useState(false);
  const [isDashboardDropdownOpen, setIsDashboardDropdownOpen] = useState(false);
  const [popupNotification, setPopupNotification] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const userId = user?.userId != null ? String(user.userId) : null;

  // Handle responsive sidebar collapse
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      // Auto-collapse on tablet (768px-1023px)
      if (width >= 768 && width < 1024) {
        setIsSidebarCollapsed(true);
      } else if (width >= 1024) {
        setIsSidebarCollapsed(false);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isCandidate() || !userId) return;
    const load = () => {
      try {
        const list = getNotifications(userId);
        const count = (list || []).filter((n) => !n?.isRead).length;
        setUnreadCount(count);
      } catch (_) {
        setUnreadCount(0);
      }
    };
    load();
    window.addEventListener(NOTIFICATIONS_CHANGED, load);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED, load);
  }, [isCandidate(), userId]);

  useEffect(() => {
    if (!isCandidate()) return;
    const handler = (e) => {
      const n = e?.detail;
      if (!n || location.pathname === '/notifications') return;
      setPopupNotification(n);
    };
    window.addEventListener(NOTIFICATION_ADDED, handler);
    return () => window.removeEventListener(NOTIFICATION_ADDED, handler);
  }, [isCandidate(), location.pathname]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Check if dashboard or any dashboard sub-route is active
  const isDashboardActive = () => {
    return location.pathname === '/dashboard' ||
      location.pathname === '/dashboard/private' ||
      location.pathname === '/dashboard/advanced' ||
      location.pathname.startsWith('/dashboard/');
  };

  // Check if any interview management route is active
  const isInterviewManagementActive = () => {
    return isActive('/technical-round') || isActive('/hr-round');
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.fullName) return 'U';
    const names = user.fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  };

  // Get role badge color
  const getRoleBadgeColor = () => {
    if (isRecruitmentAdmin()) return 'bg-blue-500';
    if (isAdminOrRecruiter()) return 'bg-green-500';
    if (isTechnicalInterviewer()) return 'bg-purple-500';
    if (isCandidate()) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  // Get role display name
  const getRoleDisplayName = () => {
    if (isRecruitmentAdmin()) return 'Admin';
    if (isAdminOrRecruiter()) return 'Recruiter';
    if (isTechnicalInterviewer()) return 'Interviewer';
    if (isCandidate()) return 'Candidate';
    return 'User';
  };

  // Tooltip component
  const Tooltip = ({ content, children, show }) => {
    if (!show || !isSidebarCollapsed) return children;

    return (
      <div className="relative group">
        {children}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-sidebar-darker text-sidebar-text-primary px-3 py-2 rounded-lg shadow-tooltip text-sm whitespace-nowrap tooltip-arrow">
            {content}
          </div>
        </div>
      </div>
    );
  };

  // Navigation item component
  const NavItem = ({ to, icon, label, isActiveItem, onClick, children, isNested = false, isParentActive = false }) => {
    const content = (
      <Link
        to={to || '#'}
        onClick={onClick}
        className={`
          relative flex items-center transition-all duration-200 group
          ${isSidebarCollapsed ? 'justify-center px-4 py-3 my-1' : isNested ? 'px-6 pl-10 py-2.5 my-0.5' : 'px-6 py-3 my-1'}
          ${isActiveItem
            ? 'bg-sidebar-accent/20 text-white font-semibold'
            : isParentActive && isNested
              ? 'text-sidebar-text-secondary hover:text-white hover:bg-gray-700/30'
              : 'text-sidebar-text-secondary hover:text-white hover:bg-gray-700/40 font-medium'
          }
          ${isNested ? 'text-xs border-l-2 border-sidebar-border/50 ml-4' : ''}
          focus:outline-none focus:ring-2 focus:ring-sidebar-accent focus:ring-inset rounded-r-lg
        `}
        aria-label={label}
      >
        {isActiveItem && !isSidebarCollapsed && !isNested && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sidebar-accent to-sidebar-accent-hover rounded-r-full" />
        )}
        {isActiveItem && isNested && !isSidebarCollapsed && (
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-sidebar-accent rounded-full" />
        )}
        <Tooltip content={label} show={isSidebarCollapsed}>
          <div className="flex items-center w-full">
            <span className={`${isSidebarCollapsed ? '' : 'mr-3'} ${isNested ? 'w-[18px] h-[18px]' : 'w-5 h-5'} flex-shrink-0 transition-transform ${isActiveItem ? '' : 'group-hover:scale-110'}`}>
              {icon}
            </span>
            {!isSidebarCollapsed && <span className="truncate text-sm">{label}</span>}
          </div>
        </Tooltip>
        {children}
      </Link>
    );

    return content;
  };

  // Dropdown button component
  const DropdownButton = ({ icon, label, isOpen, onClick, isActiveItem }) => {
    return (
      <Tooltip content={label} show={isSidebarCollapsed}>
        <button
          type="button"
          onClick={onClick}
          className={`
            relative flex items-center justify-between w-full transition-all duration-200 group rounded-r-lg
            ${isSidebarCollapsed ? 'justify-center px-4 py-3 my-1' : 'px-6 py-3 my-1'}
            ${isActiveItem
              ? 'bg-sidebar-accent/20 text-white font-semibold'
              : 'text-sidebar-text-secondary hover:text-white hover:bg-gray-700/40 font-medium'
            }
            focus:outline-none focus:ring-2 focus:ring-sidebar-accent focus:ring-inset
          `}
          aria-label={label}
          aria-expanded={isOpen}
        >
          {isActiveItem && !isSidebarCollapsed && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sidebar-accent to-sidebar-accent-hover rounded-r-full" />
          )}
          <div className="flex items-center min-w-0 flex-1">
            <span className={`${isSidebarCollapsed ? '' : 'mr-3'} w-5 h-5 flex-shrink-0 transition-transform ${isActiveItem ? '' : 'group-hover:scale-110'}`}>
              {icon}
            </span>
            {!isSidebarCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis text-sm">{label}</span>}
          </div>
          {!isSidebarCollapsed && (
            <span className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
              <ChevronDown className="w-4 h-4" />
            </span>
          )}
        </button>
      </Tooltip>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 relative overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex-none w-full bg-gradient-to-r from-sidebar-dark to-sidebar-darker text-white z-30 flex items-center justify-between p-4 shadow-sidebar">
        <div className="flex items-center">
          <img 
            src={logo} 
            alt="WorkSphere Logo" 
            className="h-10 w-auto object-contain" 
          />
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-gray-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-sidebar-accent rounded-lg transition-colors"
          aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-sidebar-dark to-sidebar-darker text-white flex flex-col shadow-sidebar transform transition-all duration-300 ease-in-out md:translate-x-0 md:relative md:inset-auto md:h-full md:z-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarCollapsed && window.innerWidth >= 768 ? 'md:w-20' : 'md:w-72'}
        w-72
      `}>
        {/* Brand Section */}
        <div className={`
          px-3 py-3 border-b border-sidebar-border/30 flex items-center flex-shrink-0 bg-gradient-to-r from-sidebar-darker/50 to-transparent
          ${isSidebarCollapsed ? 'md:justify-center md:px-2' : ''}
        `}>
          <img
            src={logo}
            alt="WorkSphere Logo"
            className={`object-contain transition-all duration-300 ${isSidebarCollapsed ? 'h-10 w-10' : 'h-14 w-full max-w-[200px]'}`}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto sidebar-scrollbar py-4 px-2" role="navigation">
          {isAdminOrRecruiter() ? (
            // Admin/Recruiter navigation
            <>
              {isRecruitmentAdmin() ? (
                // Admin Dashboard with dropdown
                <div className="mb-1">
                  <DropdownButton
                    icon={<LayoutDashboard />}
                    label="Dashboard"
                    isOpen={isDashboardDropdownOpen}
                    onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
                    isActiveItem={isDashboardActive()}
                  />
                  {isDashboardDropdownOpen && !isSidebarCollapsed && (
                    <div className="overflow-hidden transition-all duration-300 animate-scale-in">
                      <NavItem
                        to="/dashboard/private"
                        icon={<Grid3x3 className="w-[18px] h-[18px]" />}
                        label="Private Dashboard"
                        isActiveItem={location.pathname === '/dashboard/private'}
                        isNested={true}
                        isParentActive={isDashboardActive()}
                      />
                      <NavItem
                        to="/dashboard/advanced"
                        icon={<BarChart3 className="w-[18px] h-[18px]" />}
                        label="Advanced Dashboard"
                        isActiveItem={location.pathname === '/dashboard/advanced'}
                        isNested={true}
                        isParentActive={isDashboardActive()}
                      />
                    </div>
                  )}
                </div>
              ) : (
                // Recruiter Dashboard (no dropdown)
                <NavItem
                  to="/dashboard"
                  icon={<LayoutDashboard />}
                  label="Dashboard"
                  isActiveItem={isActive('/dashboard')}
                />
              )}
              <NavItem
                to="/job-openings"
                icon={<Briefcase />}
                label="Job Openings"
                isActiveItem={isActive('/job-openings')}
              />
              <NavItem
                to="/screening"
                icon={<FileText />}
                label="Applications"
                isActiveItem={isActive('/screening')}
              />
              <div className="mb-1">
                <DropdownButton
                  icon={<Calendar />}
                  label="Interview Management"
                  isOpen={isInterviewDropdownOpen}
                  onClick={() => setIsInterviewDropdownOpen(!isInterviewDropdownOpen)}
                  isActiveItem={isInterviewManagementActive()}
                />
                {isInterviewDropdownOpen && !isSidebarCollapsed && (
                  <div className="overflow-hidden transition-all duration-300 animate-scale-in">
                    <NavItem
                      to="/technical-round"
                      icon={<Calendar className="w-[18px] h-[18px]" />}
                      label="Technical Round"
                      isActiveItem={isActive('/technical-round')}
                      isNested={true}
                      isParentActive={isInterviewManagementActive()}
                    />
                    <NavItem
                      to="/hr-round"
                      icon={<Calendar className="w-[18px] h-[18px]" />}
                      label="HR Round"
                      isActiveItem={isActive('/hr-round')}
                      isNested={true}
                      isParentActive={isInterviewManagementActive()}
                    />
                  </div>
                )}
              </div>
              <NavItem
                to="/interviews"
                icon={<Calendar />}
                label="Interviews"
                isActiveItem={isActive('/interviews')}
              />
              <NavItem
                to="/offers/management"
                icon={<FileCheck />}
                label="Offers"
                isActiveItem={isActive('/offers')}
              />
              {isRecruitmentAdmin() && (
                <NavItem
                  to="/users"
                  icon={<Users />}
                  label="User Management"
                  isActiveItem={isActive('/users')}
                />
              )}
              <NavItem
                to="/email-templates"
                icon={<Mail />}
                label="Email Templates"
                isActiveItem={isActive('/email-templates')}
              />
            </>
          ) : isTechnicalInterviewer() ? (
            // Technical Interviewer navigation
            <>
              <NavItem
                to="/dashboard"
                icon={<LayoutDashboard />}
                label="Dashboard"
                isActiveItem={isActive('/dashboard')}
              />
              <div className="mb-1">
                <DropdownButton
                  icon={<Calendar />}
                  label="Interview Management"
                  isOpen={isInterviewDropdownOpen}
                  onClick={() => setIsInterviewDropdownOpen(!isInterviewDropdownOpen)}
                  isActiveItem={isActive('/technical-round')}
                />
                {isInterviewDropdownOpen && !isSidebarCollapsed && (
                  <div className="overflow-hidden transition-all duration-300 animate-scale-in">
                    <NavItem
                      to="/technical-round"
                      icon={<Calendar className="w-[18px] h-[18px]" />}
                      label="Technical Round"
                      isActiveItem={isActive('/technical-round')}
                      isNested={true}
                      isParentActive={isActive('/technical-round')}
                    />
                  </div>
                )}
              </div>
              <NavItem
                to="/interviews"
                icon={<Calendar />}
                label="Interviews"
                isActiveItem={isActive('/interviews')}
              />
            </>
          ) : isCandidate() ? (
            // Candidate navigation
            <>
              <NavItem
                to="/dashboard"
                icon={<LayoutDashboard />}
                label="Dashboard"
                isActiveItem={isActive('/dashboard')}
              />
              <NavItem
                to="/my-profile"
                icon={<User />}
                label="My Profile"
                isActiveItem={isActive('/my-profile')}
              />
              <NavItem
                to="/documents"
                icon={<FileText />}
                label="Documents"
                isActiveItem={isActive('/documents')}
              />
              <NavItem
                to="/job-openings"
                icon={<Briefcase />}
                label="Job Openings"
                isActiveItem={isActive('/job-openings')}
              />
              <NavItem
                to="/my-applications"
                icon={<Briefcase />}
                label="My Applications"
                isActiveItem={isActive('/my-applications')}
              />
              <NavItem
                to="/upcoming-interviews"
                icon={<Calendar />}
                label="Upcoming Interviews"
                isActiveItem={isActive('/upcoming-interviews')}
              />
              <NavItem
                to="/my-offers"
                icon={<FileCheck />}
                label="My Offers"
                isActiveItem={isActive('/my-offers')}
              />
              <NavItem
                to="/notifications"
                icon={
                  <span className="relative inline-flex">
                    <Bell />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </span>
                }
                label="Notifications"
                isActiveItem={isActive('/notifications')}
              />
              <div className={`
                flex items-center text-sidebar-text-secondary/50 cursor-not-allowed rounded-r-lg
                ${isSidebarCollapsed ? 'justify-center px-4 py-3 my-1' : 'px-6 py-3 my-1'}
              `}>
                <Tooltip content="Settings (Coming Soon)" show={isSidebarCollapsed}>
                  <div className="flex items-center">
                    <Settings className={`${isSidebarCollapsed ? '' : 'mr-3'} w-5 h-5`} />
                    {!isSidebarCollapsed && <span className="font-medium">Settings</span>}
                  </div>
                </Tooltip>
              </div>
            </>
          ) : null}
        </nav>

        {/* User Section - Footer */}
        <div className="border-t border-sidebar-border/30 bg-sidebar-darker/50">
          {!isSidebarCollapsed ? (
            <div className="p-3">
              {/* User Profile */}
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-9 h-9 rounded-full ${getRoleBadgeColor()} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                  {getUserInitials()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user?.fullName}</p>
                  <p className="text-[10px] text-sidebar-text-secondary/60 mt-0.5">
                    {getRoleDisplayName()}
                  </p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogoutClick}
                className="flex items-center justify-center w-full px-3 py-1.5 text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-md transition-all duration-200 font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-red-500 group"
              >
                <LogOut className="mr-1.5 w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                Logout
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <Tooltip content={
                <div className="text-left">
                  <p className="font-semibold text-sm">{user?.fullName}</p>
                  <p className="text-xs text-sidebar-text-secondary mt-1">{getRoleDisplayName()}</p>
                  <p className="text-xs text-sidebar-text-secondary mt-0.5">{user?.email}</p>
                </div>
              } show={true}>
                <div className={`w-9 h-9 rounded-full ${getRoleBadgeColor()} flex items-center justify-center text-white font-bold text-xs mx-auto cursor-pointer hover:scale-110 transition-transform`}>
                  {getUserInitials()}
                </div>
              </Tooltip>
              <button
                onClick={handleLogoutClick}
                className="w-full p-2 text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 rounded-md transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500 group"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto relative w-full main-content-responsive no-horizontal-scroll">
        <div className="content-max-width">
          <Outlet />
        </div>
        {isCandidate() && popupNotification && (
          <NotificationPopup
            notification={popupNotification}
            onDismiss={() => setPopupNotification(null)}
            onClick={() => navigate('/notifications')}
          />
        )}
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogoutConfirm}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will need to sign in again to access your account."
        confirmText="Logout"
        cancelText="Cancel"
        type="warning"
      />
    </div>
  );
};

export default Layout;
