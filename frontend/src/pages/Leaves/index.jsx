import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import LeavesListView from '../../components/Leaves/ListView';
import CalendarView from '../../components/Leaves/CalendarView';
import MyLeavesView from '../../components/Leaves/MyLeavesView';
import LeaveDetailsModal from '../../components/Leaves/LeaveDetailsModal';
import { useAuth } from '../../context/AuthContext';
import { leaveService } from '../../api/leaveService';

const LeavesPage = ({ initialView = 'list' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, user, getModulePermission } = useAuth();

  // Get permissions for Leaves module
  const viewPermission = getModulePermission('Leaves', 'view');
  const updatePermission = getModulePermission('Leaves', 'update');
  const hasAllViewPermission = isAdmin() || viewPermission === 'All';
  const hasAllUpdatePermission = isAdmin() || updatePermission === 'All';
  const canAdd = isAdmin() || getModulePermission('Leaves', 'add') !== 'None';
  const canUpdate = isAdmin() || getModulePermission('Leaves', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Leaves', 'delete') !== 'None';

  const [activeView, setActiveView] = useState(initialView);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const listRef = useRef(null);
  const calendarRef = useRef(null);
  const myLeavesRef = useRef(null);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView, location.pathname]);

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  const handleNewLeave = () => {
    navigate('/leaves/new');
  };

  const handleExport = () => {
    if (activeView === 'list') {
      listRef.current?.exportToExcel();
    }
  };

  const openDetails = (leave) => {
    setSelectedLeave(leave);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelectedLeave(null);
    setDetailsOpen(false);
  };

  const refreshAllViews = () => {
    listRef.current?.refresh();
    calendarRef.current?.refresh();
    myLeavesRef.current?.refresh();
  };

  const handleStatusUpdate = async (status) => {
    if (!selectedLeave) return;
    try {
      setUpdatingStatus(true);
      const payload = {
        userId: selectedLeave.userId,
        leaveTypeId: selectedLeave.leaveTypeId,
        startDate: selectedLeave.startDate,
        endDate: selectedLeave.endDate,
        durationType: selectedLeave.durationType,
        status,
        reason: selectedLeave.reason,
        fileUrl: selectedLeave.fileUrl,
      };
      await leaveService.update(selectedLeave.id, payload);
      closeDetails();
      refreshAllViews();
    } catch (error) {
      alert(error?.response?.data?.message || 'Unable to update leave status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-wrap gap-2">
                {canAdd && (
                  <button
                    type="button"
                    onClick={handleNewLeave}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + New Leave
                  </button>
                )}
                {activeView === 'list' && (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Export
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {VIEW_BUTTONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleViewChange(key)}
                    className={`flex items-center gap-2 px-3 py-2 border rounded text-sm ${
                      activeView === key
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700'
                    }`}
                    title={label}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {activeView === 'list' && (
              <LeavesListView
                ref={listRef}
                isAdmin={isAdmin()}
                hasAllViewPermission={hasAllViewPermission}
                user={user}
                onViewDetails={openDetails}
              />
            )}

            {activeView === 'calendar' && (
              <CalendarView
                ref={calendarRef}
                isAdmin={isAdmin()}
                hasAllViewPermission={hasAllViewPermission}
                user={user}
                onViewDetails={openDetails}
              />
            )}

            {activeView === 'my' && <MyLeavesView ref={myLeavesRef} user={user} />}
          </div>
        </main>
      </div>

      <LeaveDetailsModal
        leave={selectedLeave}
        isAdmin={isAdmin()}
        canUpdate={canUpdate}
        canDelete={canDelete}
        hasAllUpdatePermission={hasAllUpdatePermission}
        isOpen={detailsOpen}
        onClose={closeDetails}
        onUpdateStatus={handleStatusUpdate}
        onDelete={async () => {
          if (!selectedLeave) return;
          try {
            setUpdatingStatus(true);
            await leaveService.delete(selectedLeave.id);
            closeDetails();
            refreshAllViews();
          } catch (error) {
            alert(error?.response?.data?.message || 'Unable to delete leave');
          } finally {
            setUpdatingStatus(false);
          }
        }}
        updating={updatingStatus}
      />
    </div>
  );
};

const ListIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CalendarIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10m-11 8h12a2 2 0 002-2V7a2 2 0 00-2-2h-1V3m-8 2H8V3M5 21H4a2 2 0 01-2-2v-4h3"
    />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5.121 17.804A4 4 0 018.88 15h6.24a4 4 0 013.758 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const VIEW_BUTTONS = [
  { key: 'list', label: 'List', icon: ListIcon },
  { key: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { key: 'my', label: 'My Leaves', icon: UserIcon },
];

export default LeavesPage;


