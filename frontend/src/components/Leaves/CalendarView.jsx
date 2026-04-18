import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { leaveService, leaveTypeService } from '../../api/leaveService';
import { employeeService } from '../../api/employeeService';
import '../../pages/Calendar/calendar.css';

const CalendarView = forwardRef(({ isAdmin, hasAllViewPermission, user, onViewDetails }, ref) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calendarView, setCalendarView] = useState('dayGridMonth');
  const [employeeFilter, setEmployeeFilter] = useState(hasAllViewPermission ? 'All' : user?.userId?.toString() || '');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);

  const calendarRef = useRef(null);

  useEffect(() => {
    if (!hasAllViewPermission) {
      setEmployeeFilter(user?.userId ? user.userId.toString() : '');
    }
  }, [hasAllViewPermission, user?.userId]);

  useEffect(() => {
    loadOptions();
    loadLeaves();
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [employeeFilter, leaveTypeFilter, statusFilter, searchTerm]);

  const loadOptions = async () => {
    try {
      const leaveTypeRequest = hasAllViewPermission ? leaveTypeService.getAll : leaveTypeService.getApplicable;
      const leaveTypesRes = await leaveTypeRequest();
      setLeaveTypes(leaveTypesRes.data || []);

      if (hasAllViewPermission) {
        const employeesRes = await employeeService.getAll();
        setEmployees(employeesRes.data || []);
      }
    } catch (error) {
    }
  };

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const params = {};
      if (employeeFilter !== 'All' && employeeFilter) params.userId = employeeFilter;
      if (leaveTypeFilter !== 'All') params.leaveTypeId = leaveTypeFilter;
      if (statusFilter !== 'All') params.status = statusFilter;
      const response = await leaveService.getAll(params);
      let data = response.data || [];

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        data = data.filter(
          (leave) =>
            leave.userFullName?.toLowerCase().includes(searchLower) ||
            leave.leaveTypeName?.toLowerCase().includes(searchLower)
        );
      }

      setLeaves(data);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const calendarEvents = leaves.map((leave) => {
    const statusColors = {
      PENDING: '#fbbf24',
      APPROVED: '#10b981',
      REJECTED: '#ef4444',
    };
    const endDate = new Date(leave.endDate);
    endDate.setDate(endDate.getDate() + 1);
    return {
      id: leave.id.toString(),
      title: `${leave.userFullName} - ${leave.leaveTypeName}`,
      start: leave.startDate,
      end: endDate.toISOString().split('T')[0],
      allDay: true,
      backgroundColor: statusColors[leave.status] || '#6b7280',
      borderColor: statusColors[leave.status] || '#6b7280',
      extendedProps: {
        leave,
      },
    };
  });

  const handleViewChange = (viewName) => {
    setCalendarView(viewName);
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      api.changeView(viewName);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: loadLeaves,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {hasAllViewPermission && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              >
                <option value="All">All</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id.toString()}>
                    {emp.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
            >
              <option value="All">All</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id.toString()}>
                  {lt.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
            >
              <option value="All">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Start typing to search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-4 space-y-4">
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => handleViewChange('dayGridMonth')}
            className={`px-3 py-1.5 rounded text-sm ${
              calendarView === 'dayGridMonth'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('timeGridWeek')}
            className={`px-3 py-1.5 rounded text-sm ${
              calendarView === 'timeGridWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('timeGridDay')}
            className={`px-3 py-1.5 rounded text-sm ${
              calendarView === 'timeGridDay'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Day
          </button>
          <button
            type="button"
            onClick={() => handleViewChange('listWeek')}
            className={`px-3 py-1.5 rounded text-sm ${
              calendarView === 'listWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            List
          </button>
        </div>

        <div>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading calendar...</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView={calendarView}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: '',
              }}
              events={calendarEvents}
              nowIndicator
              editable={false}
              selectable={false}
              height="auto"
              contentHeight="auto"
              aspectRatio={1.8}
              views={{
                dayGridMonth: { buttonText: 'Month' },
                timeGridWeek: { buttonText: 'Week' },
                timeGridDay: { buttonText: 'Day' },
                listWeek: { buttonText: 'List' },
              }}
              ref={calendarRef}
              eventContent={(eventInfo) => (
                <div className="fc-event-title text-xs md:text-sm">{eventInfo.event.title}</div>
              )}
              eventClick={(info) => {
                info.jsEvent.preventDefault();
                onViewDetails(info.event.extendedProps.leave);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
});

export default CalendarView;


