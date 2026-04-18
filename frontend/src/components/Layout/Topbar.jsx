import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';
import { FiMenu } from 'react-icons/fi';
import ConfirmationModal from '../UI/ConfirmationModal';

const Topbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleSidebar } = useSidebar();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  // Map routes to page names
  const getPageName = () => {
    const path = location.pathname;
    
    if (path.includes('/dashboard/private')) return 'Dashboard';
    if (path.includes('/dashboard/advanced')) return 'Dashboard';
    if (path.includes('/employees')) {
      if (path.includes('/new')) return 'Add Employee';
      if (path.includes('/edit')) return 'Edit Employee';
      if (path.includes('/view')) return 'View Employee';
      return 'Employees';
    }
    if (path.includes('/hr/departments')) return 'Departments';
    if (path.includes('/hr/designations')) return 'Designations';
    if (path.includes('/settings/roles')) return 'Roles & Permissions';
    if (path.includes('/settings/profile')) return 'Profile Settings';
    if (path.includes('/hr/shift-roster')) {
      if (path.includes('/create-shift')) return 'Create Shift';
      if (path.includes('/assign')) return 'Assign Bulk Shifts';
      return 'Shift Roster';
    }
    if (path.includes('/hr/holidays')) return 'Holidays';
    if (path.includes('/work/projects')) {
      if (path.match(/\/work\/projects\/\d+$/)) return 'Project Details';
      return 'Projects';
    }
    if (path.includes('/work/tasks')) return 'Tasks';
    if (path.includes('/attendance')) return 'Attendance';
    if (path.includes('/calendar')) return 'Calendar';
    if (path.includes('/tickets')) {
      if (path.includes('/create')) return 'Create Ticket';
      if (path.includes('/files')) return 'Ticket Files';
      if (path.match(/\/tickets\/\d+$/)) return 'Ticket Details';
      return 'Tickets';
    }
    if (path.includes('/leaves')) {
      if (path.includes('/new')) return 'New Leave';
      if (path.includes('/calendar')) return 'Leave Calendar';
      if (path.includes('/my-leaves')) return 'My Leaves';
      return 'Leaves';
    }
    if (path.includes('/events')) return 'Events';
    
    return 'Dashboard';
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 relative z-40">
      <div className="flex items-center justify-between px-4 md:px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSidebar();
            }}
            className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Toggle sidebar"
            type="button"
          >
            <FiMenu className="w-6 h-6" />
          </button>
          <h1 className="text-base md:text-lg font-semibold text-gray-800">{getPageName()}</h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <span className="hidden sm:inline text-xs md:text-sm text-gray-600">{user?.fullName}</span>
          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
            {user?.role}
          </span>
          <button
            onClick={handleLogoutClick}
            className="px-3 md:px-4 py-2 text-xs md:text-sm text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded-md"
          >
            Logout
          </button>
        </div>
      </div>

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
    </header>
  );
};

export default Topbar;

