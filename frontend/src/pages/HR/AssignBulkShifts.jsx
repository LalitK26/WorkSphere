import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import Avatar from '../../components/UI/Avatar';
import SearchableEmployeeSelect from '../../components/UI/SearchableEmployeeSelect';
import { employeeService } from '../../api/employeeService';
import { shiftService } from '../../api/shiftService';
import { shiftRosterService } from '../../api/shiftRosterService';
import { useDebounce } from '../../hooks/useDebounce';

const AssignBulkShifts = () => {
  const navigate = useNavigate();
  const today = new Date();

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [shiftId, setShiftId] = useState('');
  const [assignType, setAssignType] = useState('DATE');
  const [singleDate, setSingleDate] = useState(today.toISOString().split('T')[0]);
  const [rangeStart, setRangeStart] = useState(today.toISOString().split('T')[0]);
  const [rangeEnd, setRangeEnd] = useState(today.toISOString().split('T')[0]);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [sendEmail, setSendEmail] = useState(true);
  const [remark, setRemark] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isDepartmentDropdownOpen, setIsDepartmentDropdownOpen] = useState(false);
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');
  const departmentDropdownRef = useRef(null);
  
  // Pagination for employee list
  const [employeePage, setEmployeePage] = useState(0);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [hasMoreEmployees, setHasMoreEmployees] = useState(true);
  const employeeListRef = useRef(null);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const shiftRes = await shiftService.getAll();
        setShifts(shiftRes.data || []);
        // Load first page of employees
        await loadEmployees(0, '');
      } catch (err) {
      }
    };
    loadInitial();
  }, []);

  // Load employees with pagination
  const loadEmployees = useCallback(async (pageNum = 0, search = '') => {
    try {
      setEmployeeLoading(true);
      const response = await employeeService.getAllPaginated(pageNum, 50, search);
      const newEmployees = response.data.content || [];
      
      if (pageNum === 0) {
        setEmployees(newEmployees);
      } else {
        setEmployees(prev => [...prev, ...newEmployees]);
      }
      
      setHasMoreEmployees(response.data.totalPages > pageNum + 1);
      setEmployeePage(pageNum);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setEmployeeLoading(false);
    }
  }, []);

  // Reload employees when search changes
  useEffect(() => {
    setEmployeePage(0);
    setEmployees([]);
    loadEmployees(0, debouncedSearch);
  }, [debouncedSearch, loadEmployees]);

  // Infinite scroll for employee list
  const handleEmployeeListScroll = useCallback(() => {
    if (!employeeListRef.current || employeeLoading || !hasMoreEmployees) return;
    
    const { scrollTop, scrollHeight, clientHeight } = employeeListRef.current;
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      loadEmployees(employeePage + 1, debouncedSearch);
    }
  }, [employeePage, debouncedSearch, employeeLoading, hasMoreEmployees, loadEmployees]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (departmentDropdownRef.current && !departmentDropdownRef.current.contains(event.target)) {
        setIsDepartmentDropdownOpen(false);
        setDepartmentSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get departments from loaded employees (client-side filtering for department)
  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filter employees by department (search is handled server-side)
  const filteredEmployees = employees.filter((emp) => {
    return departmentFilter ? emp.department === departmentFilter : true;
  });

  const toggleEmployee = (id) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((empId) => empId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const ids = filteredEmployees.map((emp) => emp.id);
    setSelectedEmployees(ids);
  };

  const handleDeselectAll = () => setSelectedEmployees([]);

  const handleFileChange = (file) => {
    if (!file) {
      setFileName('');
      setFileContent('');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFileName(file.name);
      setFileContent(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!shiftId) {
      setError('Please select a shift');
      return;
    }

    if (!selectedEmployees.length) {
      setError('Please select at least one employee');
      return;
    }

    const payload = {
      shiftId: Number(shiftId),
      employeeIds: selectedEmployees,
      assignType,
      remark,
      sendEmail,
      fileName,
      fileContent,
    };

    if (assignType === 'DATE') {
      payload.date = singleDate;
    } else if (assignType === 'MULTIPLE') {
      if (!rangeStart || !rangeEnd) {
        setError('Please select start and end dates');
        return;
      }
      if (new Date(rangeEnd) < new Date(rangeStart)) {
        setError('End date cannot be before start date');
        return;
      }
      payload.rangeStart = rangeStart;
      payload.rangeEnd = rangeEnd;
    } else if (assignType === 'MONTH') {
      payload.month = month;
      payload.year = year;
    }

    setSaving(true);
    try {
      await shiftRosterService.assignBulk(payload);
      navigate('/hr/shift-roster');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign shifts');
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="hidden">
              {/* Page title removed - shown in topbar */}
            </div>
            <button
              onClick={() => navigate('/hr/shift-roster')}
              className="p-2 rounded-full hover:bg-gray-200"
              aria-label="Go back"
            >
              {/* Back Arrow Logo */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-700"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="bg-blue-50 border border-blue-200 rounded px-4 py-3 mb-6 text-sm text-blue-800">
              The existing shift will be overridden. Sundays are automatically treated as holidays and will be skipped.
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">Department</label>
                  <div className="relative" ref={departmentDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDepartmentDropdownOpen(!isDepartmentDropdownOpen)}
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-left text-gray-900 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <span className={departmentFilter ? 'text-gray-900' : 'text-gray-500'}>
                        {departmentFilter || '--'}
                      </span>
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isDepartmentDropdownOpen && (
                      <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg max-h-60 overflow-hidden">
                        <div className="p-2 border-b border-gray-200">
                          <input
                            type="text"
                            value={departmentSearchTerm}
                            onChange={(e) => setDepartmentSearchTerm(e.target.value)}
                            placeholder="Search departments..."
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              setDepartmentFilter('');
                              setIsDepartmentDropdownOpen(false);
                              setDepartmentSearchTerm('');
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                              !departmentFilter ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                            }`}
                          >
                            --
                          </button>
                          {departments
                            .filter(dept => 
                              dept.toLowerCase().includes(departmentSearchTerm.toLowerCase())
                            )
                            .map((dept) => {
                              const isSelected = departmentFilter === dept;
                              return (
                                <button
                                  key={dept}
                                  type="button"
                                  onClick={() => {
                                    setDepartmentFilter(dept);
                                    setIsDepartmentDropdownOpen(false);
                                    setDepartmentSearchTerm('');
                                  }}
                                  className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                    isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                  }`}
                                >
                                  {dept}
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">Employee Shift</label>
                  <select
                    className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={shiftId}
                    onChange={(e) => setShiftId(e.target.value)}
                    required
                  >
                    <option value="">Select Shift</option>
                    {shifts.map((shift) => (
                      <option key={shift.id} value={shift.id}>
                        {shift.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">Employees *</label>
                <div className="bg-white border border-gray-300 rounded-lg">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                        onClick={handleSelectAll}
                      >
                        Select All (Filtered)
                      </button>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                        onClick={handleDeselectAll}
                      >
                        Deselect All
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Search employees..."
                      className="bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div 
                    ref={employeeListRef}
                    onScroll={handleEmployeeListScroll}
                    className="max-h-60 overflow-y-auto"
                  >
                    {employeeLoading && employees.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">Loading employees...</div>
                    ) : filteredEmployees.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        {searchTerm ? 'No employees found' : 'No employees available'}
                      </div>
                    ) : (
                      <>
                        {filteredEmployees.map((emp) => {
                          const selected = selectedEmployees.includes(emp.id);
                          return (
                            <div
                              key={emp.id}
                              className={`w-full flex items-center gap-3 px-4 py-2 border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${selected ? 'bg-blue-50' : 'bg-transparent'
                                }`}
                              onClick={() => toggleEmployee(emp.id)}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleEmployee(emp.id)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <Avatar
                                profilePictureUrl={emp.profilePictureUrl}
                                fullName={emp.fullName}
                                size="w-8 h-8"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">{emp.fullName}</div>
                                <div className="text-xs text-gray-600 truncate">{emp.designationName || emp.email}</div>
                              </div>
                            </div>
                          );
                        })}
                        {employeeLoading && employees.length > 0 && (
                          <div className="px-4 py-2 text-center text-xs text-gray-500">Loading more...</div>
                        )}
                        {!hasMoreEmployees && employees.length > 0 && (
                          <div className="px-4 py-2 text-center text-xs text-gray-400 border-t">
                            All employees loaded ({employees.length} total)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">Assign Shift By</label>
                  <div className="flex items-center gap-4 text-sm text-gray-900">
                    {['DATE', 'MULTIPLE', 'MONTH'].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          value={type}
                          checked={assignType === type}
                          onChange={() => setAssignType(type)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        {type === 'DATE' ? 'Date' : type === 'MULTIPLE' ? 'Multiple' : 'Month'}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">
                    {assignType === 'DATE'
                      ? 'Select Date'
                      : assignType === 'MULTIPLE'
                        ? 'Select Date Range'
                        : 'Select Month'}
                  </label>
                  {assignType === 'DATE' && (
                    <input
                      type="date"
                      className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                    />
                  )}
                  {assignType === 'MULTIPLE' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">From</label>
                        <input
                          type="date"
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={rangeStart}
                          onChange={(e) => setRangeStart(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase text-gray-500 mb-1">To</label>
                        <input
                          type="date"
                          className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                  {assignType === 'MONTH' && (
                    <div className="flex gap-2">
                      <select
                        className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                      >
                        {Array.from({ length: 12 }, (_, idx) => idx + 1).map((m) => (
                          <option key={m} value={m}>
                            {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                      <select
                        className="flex-1 bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                      >
                        {Array.from({ length: 5 }, (_, idx) => today.getFullYear() - 2 + idx).map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendEmail"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="sendEmail" className="text-sm text-gray-700">
                  Send Email
                </label>
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">Remark</label>
                <textarea
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 min-h-[100px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs uppercase text-gray-600 mb-1 font-medium">Add File</label>
                <label className="w-full flex items-center justify-center border border-dashed border-gray-300 rounded py-6 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />
                  <div className="text-sm text-gray-600">
                    {fileName ? fileName : 'Choose a file'}
                  </div>
                </label>
              </div>

              {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>}

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded text-sm font-semibold hover:bg-gray-300 transition-colors"
                  onClick={() => navigate('/hr/shift-roster')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AssignBulkShifts;
