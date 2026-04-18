import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import Avatar from '../../components/UI/Avatar';
import { shiftRosterService } from '../../api/shiftRosterService';
import { shiftService } from '../../api/shiftService';
import { attendanceService } from '../../api/attendanceService';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';

const getWeekday = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, { weekday: 'short' });
};

const ShiftRoster = () => {
  const navigate = useNavigate();
  const { isAdmin, getModulePermission } = useAuth();
  const today = new Date();

  // Get permissions for Shift Roster module
  // For shift management (create/delete shifts), "All" permission is required since shifts are system-level entities
  // For shift assignments (update roster), any non-None permission is allowed
  const canAdd = isAdmin() || getModulePermission('Shift Roster', 'add') === 'All';
  const canUpdate = isAdmin() || getModulePermission('Shift Roster', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Shift Roster', 'delete') === 'All';

  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [roster, setRoster] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [holidayMap, setHolidayMap] = useState(new Map()); // Map<`${userId}-${date}`, boolean>
  const [leaveMap, setLeaveMap] = useState(new Map()); // Map<`${userId}-${date}`, boolean>
  const [searchInput, setSearchInput] = useState(''); // Local input value (updates immediately)
  const debouncedSearch = useDebounce(searchInput, 300); // Debounced value for API calls
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const searchInputRef = useRef(null);
  const [modalState, setModalState] = useState({
    open: false,
    employee: null,
    day: null,
    shiftId: '',
    remark: '',
    fileName: '',
    fileContent: '',
    sendEmail: true, // Default to true so emails are sent
    error: '',
    saving: false,
  });
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    shiftId: '',
    error: '',
    deleting: false,
  });

  // Fetch attendance data to get per-user holiday and leave flags (reuses same backend logic as Attendance)
  const fetchHolidays = useCallback(async () => {
    try {
      const { data } = await attendanceService.getAllByMonth(year, month);
      // Create maps: `${userId}-${date}` -> isHoliday/isOnLeave
      const holidayMapData = new Map();
      const leaveMapData = new Map();
      data.forEach((attendance) => {
        if (attendance.userId && attendance.attendanceDate) {
          const dateStr = typeof attendance.attendanceDate === 'string' 
            ? attendance.attendanceDate.split('T')[0] 
            : new Date(attendance.attendanceDate).toISOString().split('T')[0];
          const key = `${attendance.userId}-${dateStr}`;
          
          if (attendance.status === 'HOLIDAY') {
            holidayMapData.set(key, true);
          } else if (attendance.status === 'ON_LEAVE') {
            leaveMapData.set(key, true);
          }
        }
      });
      setHolidayMap(holidayMapData);
      setLeaveMap(leaveMapData);
    } catch (error) {
    }
  }, [year, month]);

  // Use debouncedSearch for API calls instead of searchInput
  useEffect(() => {
    fetchRoster();
    fetchHolidays();
  }, [month, year, debouncedSearch, page, pageSize, fetchHolidays]);

  // Refresh holidays when window gains focus (to catch holiday changes from other tabs/windows)
  useEffect(() => {
    const handleFocus = () => {
      fetchHolidays();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchHolidays]);

  const loadShifts = useCallback(async () => {
    try {
      const { data } = await shiftService.getAll();
      setShifts(data);
    } catch (error) {
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const { data } = await shiftRosterService.getRoster(year, month, debouncedSearch, page, pageSize);
      setRoster(data.employees || []);
      setTotalElements(data.totalElements || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };


  const days = useMemo(() => {
    const base = new Date(year, month - 1, 1);
    const list = [];
    while (base.getMonth() === month - 1) {
      list.push({
        date: base.toISOString().split('T')[0],
        label: base.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNumber: base.getDate(),
      });
      base.setDate(base.getDate() + 1);
    }
    return list;
  }, [month, year]);

  // Check if a day is a holiday for an employee
  const isHoliday = (userId, date) => {
    return holidayMap.get(`${userId}-${date}`) === true;
  };

  // Check if a day is on leave for an employee
  const isOnLeave = (userId, date) => {
    return leaveMap.get(`${userId}-${date}`) === true;
  };

  const openModal = (employee, day) => {
    // Prevent opening modal for holidays or leave days without shifts
    if ((isHoliday(employee.userId, day.date) || isOnLeave(employee.userId, day.date)) && !day.shift) {
      return;
    }
    setModalState((prev) => ({
      ...prev,
      open: true,
      employee,
      day,
      shiftId: day.shift?.id ? String(day.shift.id) : '',
      remark: '',
      fileName: '',
      fileContent: '',
      sendEmail: true, // Default to true so emails are sent
      error: '',
      saving: false,
    }));
  };

  const closeModal = () =>
    setModalState((prev) => ({
      ...prev,
      open: false,
      employee: null,
      day: null,
      shiftId: '',
      remark: '',
      fileName: '',
      fileContent: '',
      sendEmail: true,
      error: '',
      saving: false,
    }));

  const handleFileChange = (file) => {
    if (!file) {
      setModalState((prev) => ({ ...prev, fileContent: '', fileName: '' }));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setModalState((prev) => ({
        ...prev,
        fileName: file.name,
        fileContent: reader.result,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleModalSave = async () => {
    if (!modalState.shiftId) {
      setModalState((prev) => ({ ...prev, error: 'Please select a shift' }));
      return;
    }
    setModalState((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      await shiftRosterService.updateDay({
        userId: modalState.employee.userId,
        shiftId: Number(modalState.shiftId),
        date: modalState.day.date,
        remark: modalState.remark,
        fileName: modalState.fileName,
        fileContent: modalState.fileContent,
        sendEmail: modalState.sendEmail,
      });
      closeModal();
      fetchRoster();
    } catch (error) {
      setModalState((prev) => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to update shift',
        saving: false,
      }));
    }
  };

  const openDeleteModal = () =>
    setDeleteModal({ open: true, shiftId: '', error: '', deleting: false });

  const closeDeleteModal = () =>
    setDeleteModal({ open: false, shiftId: '', error: '', deleting: false });

  const handleDeleteShift = async () => {
    if (!deleteModal.shiftId) {
      setDeleteModal((prev) => ({ ...prev, error: 'Please select a shift to delete' }));
      return;
    }
    setDeleteModal((prev) => ({ ...prev, deleting: true, error: '' }));
    try {
      await shiftService.remove(deleteModal.shiftId);
      await loadShifts();
      closeDeleteModal();
    } catch (error) {
      setDeleteModal((prev) => ({
        ...prev,
        error: error.response?.data?.message || 'Failed to delete shift',
        deleting: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading shift roster...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 text-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="hidden">
              {/* Page title removed - shown in topbar */}
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {canDelete && (
                <button
                  className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 min-h-[44px]"
                  onClick={openDeleteModal}
                  disabled={!shifts.length}
                >
                  Delete Shift
                </button>
              )}
              {canAdd && (
                <>
                  <button
                    className="px-4 py-2.5 bg-white rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 min-h-[44px]"
                    onClick={() => navigate('/hr/shift-roster/create-shift')}
                  >
                    <span className="hidden sm:inline">+ Create Shift</span>
                    <span className="sm:hidden">+ Create</span>
                  </button>
                  <button
                    className="px-4 py-2.5 bg-sky-600 text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 min-h-[44px]"
                    onClick={() => navigate('/hr/shift-roster/assign')}
                  >
                    <span className="hidden sm:inline">+ Assign Bulk Shifts</span>
                    <span className="sm:hidden">+ Assign</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <select
                  value={month}
                  onChange={(e) => {
                    setMonth(Number(e.target.value));
                    setPage(0); // Reset to first page when month changes
                  }}
                  className="bg-white border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => {
                    setYear(Number(e.target.value));
                    setPage(0); // Reset to first page when year changes
                  }}
                  className="bg-white border border-slate-300 rounded px-3 py-2 text-sm"
                >
                  {Array.from({ length: 5 }, (_, idx) => today.getFullYear() - 2 + idx).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 max-w-md">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name, designation, or employee ID..."
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(0); // Reset to first page when search changes
                  }}
                  onFocus={(e) => e.target.select()} // Select all text on focus for easier editing
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  autoComplete="off"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-600">Show:</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0); // Reset to first page when page size changes
                  }}
                  className="bg-white border border-slate-300 rounded px-2 py-1 text-sm"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-white text-left px-4 py-2 w-64 border-b border-slate-200">
                      Employee
                    </th>
                    {days.map((day) => (
                      <th
                        key={day.date}
                        className="px-2 py-2 text-center text-xs font-medium text-slate-500 border-b border-slate-200"
                      >
                        <div>{day.label}</div>
                        <div className="text-base text-slate-900">{day.dayNumber}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roster.map((employee) => (
                    <tr key={employee.userId} className="border-t border-slate-200">
                      <td className="sticky left-0 bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            profilePictureUrl={employee.profilePictureUrl}
                            fullName={employee.fullName}
                            size="w-8 h-8"
                          />
                          <div>
                            <div className="font-semibold">{employee.fullName}</div>
                            <div className="text-xs text-slate-500">{employee.designation || 'Employee'}</div>
                          </div>
                        </div>
                      </td>
                      {(employee.days || []).map((day) => {
                        const isDayHoliday = isHoliday(employee.userId, day.date);
                        const isDayOnLeave = isOnLeave(employee.userId, day.date);
                        return (
                          <td key={`${employee.userId}-${day.date}`} className="px-2 py-2 text-center">
                            {isDayHoliday && !day.shift ? (
                              <div className="text-yellow-500 text-lg">⭐</div>
                            ) : isDayOnLeave ? (
                              <div className="w-full px-2 py-1 bg-indigo-100 border border-indigo-200 rounded text-xs text-indigo-700 font-medium">
                                On Leave
                              </div>
                            ) : day.shift ? (
                              <button
                                className={`w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded text-xs text-slate-700 ${canUpdate ? 'cursor-pointer hover:bg-slate-200' : 'cursor-default'}`}
                                onClick={() => canUpdate && openModal(employee, day)}
                                disabled={!canUpdate}
                              >
                                {day.shift.name}
                              </button>
                            ) : (
                              canUpdate && !isDayHoliday && (
                                <button
                                  className="w-full h-8 bg-white rounded border border-dashed border-slate-300 text-xl text-slate-400 hover:bg-slate-50"
                                  onClick={() => openModal(employee, day)}
                                >
                                  +
                                </button>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalElements)} of {totalElements} employees
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(0)}
                    disabled={page === 0}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPage(totalPages - 1)}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {modalState.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold">Update Shift</h3>
                <p className="text-xs text-slate-500">
                  Date: {modalState.day.date} ({getWeekday(modalState.day.date)})
                </p>
              </div>
              <button className="text-slate-400" onClick={closeModal}>
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Employee</label>
                <div className="px-3 py-2 bg-slate-100 rounded border border-slate-200">
                  {modalState.employee?.fullName}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Employee Shift</label>
                <select
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2"
                  value={modalState.shiftId}
                  onChange={(e) => setModalState((prev) => ({ ...prev, shiftId: e.target.value }))}
                >
                  <option value="">Select Shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Remark</label>
                <textarea
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2 min-h-[80px]"
                  value={modalState.remark}
                  onChange={(e) => setModalState((prev) => ({ ...prev, remark: e.target.value }))}
                  placeholder="Add remarks"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Add File</label>
                <label className="w-full flex items-center justify-center border border-dashed border-slate-300 rounded py-6 cursor-pointer bg-slate-50">
                  <input
                    type="file"
                    accept="*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />
                  <div className="text-sm text-slate-500">
                    {modalState.fileName ? modalState.fileName : 'Choose a file'}
                  </div>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmailNotification"
                  checked={modalState.sendEmail}
                  onChange={(e) => setModalState((prev) => ({ ...prev, sendEmail: e.target.checked }))}
                  className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                />
                <label htmlFor="sendEmailNotification" className="text-sm text-gray-700">
                  Send email notification to employee
                </label>
              </div>
              {modalState.error && <div className="text-red-500 text-sm">{modalState.error}</div>}
              <div className="flex justify-end gap-3">
                <button className="px-4 py-2 bg-slate-100 border border-slate-200 rounded" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-sky-600 text-white rounded disabled:opacity-60"
                  onClick={handleModalSave}
                  disabled={modalState.saving}
                >
                  {modalState.saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-semibold text-rose-600">Delete Shift</h3>
                <p className="text-xs text-slate-500">Deleting a shift cannot be undone.</p>
              </div>
              <button className="text-slate-400" onClick={closeDeleteModal}>
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-1">Select Shift</label>
                <select
                  className="w-full bg-white border border-slate-300 rounded px-3 py-2"
                  value={deleteModal.shiftId}
                  onChange={(e) => setDeleteModal((prev) => ({ ...prev, shiftId: e.target.value }))}
                >
                  <option value="">Choose a shift</option>
                  {shifts.map((shift) => (
                    <option key={shift.id} value={shift.id}>
                      {shift.label}
                    </option>
                  ))}
                </select>
              </div>
              {deleteModal.error && <div className="text-red-500 text-sm">{deleteModal.error}</div>}
              <div className="flex justify-end gap-3">
                <button className="px-4 py-2 bg-slate-100 border border-slate-200 rounded" onClick={closeDeleteModal}>
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-rose-600 text-white rounded disabled:opacity-60"
                  onClick={handleDeleteShift}
                  disabled={deleteModal.deleting}
                >
                  {deleteModal.deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftRoster;


