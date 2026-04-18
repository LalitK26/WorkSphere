import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { leaveService, leaveTypeService } from '../../api/leaveService';
import { employeeService } from '../../api/employeeService';
import { formatDate } from '../../utils/formatters';

const LeavesListView = forwardRef(({ isAdmin, hasAllViewPermission, user, onViewDetails }, ref) => {
  const [leaves, setLeaves] = useState([]);
  const [filteredLeaves, setFilteredLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [durationFilter, setDurationFilter] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState(hasAllViewPermission ? 'All' : user?.userId?.toString() || '');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  useEffect(() => {
    if (!hasAllViewPermission) {
      setEmployeeFilter(user?.userId ? user.userId.toString() : '');
    }
  }, [hasAllViewPermission, user?.userId]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [leaves, searchTerm, employeeFilter, leaveTypeFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    applyDurationFilter();
  }, [durationFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const leavesResponse = await leaveService.getAll();
      setLeaves(leavesResponse.data || []);
      setFilteredLeaves(leavesResponse.data || []);

      const leaveTypeRequest = hasAllViewPermission ? leaveTypeService.getAll : leaveTypeService.getApplicable;
      const leaveTypesRes = await leaveTypeRequest();
      setLeaveTypes(leaveTypesRes.data || []);

      if (hasAllViewPermission) {
        const employeesRes = await employeeService.getAll();
        setEmployees(employeesRes.data || []);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const applyDurationFilter = () => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (durationFilter) {
      case 'Today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'Last 30 Days':
        start = new Date(today);
        start.setDate(start.getDate() - 30);
        break;
      case 'This Month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case 'Last Month':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
        break;
      case 'Last 90 Days':
        start = new Date(today);
        start.setDate(start.getDate() - 90);
        break;
      case 'Last 6 Months':
        start = new Date(today);
        start.setMonth(start.getMonth() - 6);
        break;
      case 'Last 1 Year':
        start = new Date(today);
        start.setFullYear(start.getFullYear() - 1);
        break;
      case 'Custom Range':
        return;
      default:
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const applyFilters = () => {
    let temp = [...leaves];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      temp = temp.filter((leave) => {
        const leaveDate = new Date(leave.startDate);
        return leaveDate >= start && leaveDate <= end;
      });
    }

    if (employeeFilter !== 'All' && employeeFilter) {
      temp = temp.filter((leave) => leave.userId?.toString() === employeeFilter);
    }

    if (leaveTypeFilter !== 'All') {
      temp = temp.filter((leave) => leave.leaveTypeId?.toString() === leaveTypeFilter);
    }

    if (statusFilter !== 'All') {
      temp = temp.filter((leave) => leave.status === statusFilter);
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      temp = temp.filter(
        (leave) =>
          leave.userFullName?.toLowerCase().includes(searchLower) ||
          leave.leaveTypeName?.toLowerCase().includes(searchLower) ||
          leave.reason?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredLeaves(temp);
    setCurrentPage(1);
  };

  const handleExport = () => {
    const exportData = filteredLeaves.map((leave) => ({
      Employee: leave.userFullName,
      'Leave Date': formatDate(leave.startDate),
      Duration: leave.durationType,
      'Leave Status': leave.status,
      'Leave Type': leave.leaveTypeName,
      Paid: leave.paidStatus || 'N/A',
      Reason: leave.reason,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leaves');
    XLSX.writeFile(wb, `leaves_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getDurationText = (leave) => {
    if (leave.durationType === 'FIRST_HALF') return 'First Half';
    if (leave.durationType === 'SECOND_HALF') return 'Second Half';
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} Day(s)`;
  };

  const getStatusBadge = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const hasEntries = filteredLeaves.length > 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredLeaves.length / itemsPerPage)),
    [filteredLeaves.length, itemsPerPage]
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeaves = filteredLeaves.slice(startIndex, startIndex + itemsPerPage);

  const columns = [
    { key: 'userFullName', label: 'Employee' },
    { key: 'startDate', label: 'Leave Date', render: (value) => formatDate(value) },
    { key: 'durationType', label: 'Duration', render: (_value, row) => getDurationText(row) },
    { key: 'status', label: 'Leave Status', render: (value) => getStatusBadge(value) },
    { key: 'leaveTypeName', label: 'Leave Type' },
    { key: 'paidStatus', label: 'Paid', render: (value) => value || '-' },
    {
      key: 'actions',
      label: 'Action',
      render: (_value, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails(row);
          }}
          className="text-blue-600 hover:text-blue-800"
        >
          View
        </button>
      ),
    },
  ];

  useImperativeHandle(ref, () => ({
    exportToExcel: handleExport,
    refresh: loadData,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-3 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              >
                <option>Today</option>
                <option>Last 30 Days</option>
                <option>This Month</option>
                <option>Last Month</option>
                <option>Last 90 Days</option>
                <option>Last 6 Months</option>
                <option>Last 1 Year</option>
                <option>Custom Range</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
              />
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
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              className={`px-4 py-2 rounded-lg border transition-all duration-300 flex items-center gap-2 ${
                isFilterPanelOpen
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Toggle Advanced Filters"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-medium">Filters</span>
            </button>
          </div>
        </div>
        
        {/* Collapsible Filter Panel */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isFilterPanelOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="pt-3 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-600">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
              <table className="min-w-full bg-white border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedLeaves.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                        No data available in table
                      </td>
                    </tr>
                  ) : (
                    paginatedLeaves.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        {columns.map((column) => (
                          <td key={column.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-3 border-t border-gray-200 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-gray-300 rounded px-2 py-1 text-sm"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">entries</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  Showing {hasEntries ? startIndex + 1 : 0} to{' '}
                  {hasEntries ? Math.min(startIndex + itemsPerPage, filteredLeaves.length) : 0} of{' '}
                  {filteredLeaves.length} entries
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || !hasEntries}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || !hasEntries}
                  className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default LeavesListView;


