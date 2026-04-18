import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeService } from '../../api/employeeService';
import { designationService } from '../../api/designationService';
import { idCardService } from '../../api/idCardService';
import Topbar from '../../components/Layout/Topbar';
import Sidebar from '../../components/Layout/Sidebar';
import Modal from '../../components/UI/Modal';
import Avatar from '../../components/UI/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';

const EmployeesList = () => {
  // Pagination state
  const [employees, setEmployees] = useState([]);
  const [page, setPage] = useState(0);
  const [size] = useState(50); // Page size
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500); // Debounce search by 500ms
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState('');
  const [busy, setBusy] = useState(false);
  const [idCardDownloading, setIdCardDownloading] = useState(false);
  const fileInputRef = useRef(null);
  const menuRefs = useRef({});
  // Store all employees for export/import (loaded separately when needed)
  const [allEmployeesForExport, setAllEmployeesForExport] = useState([]);

  const navigate = useNavigate();
  const { isAdmin, getModulePermission } = useAuth();

  // Get permissions for Employees module
  const canAdd = isAdmin() || getModulePermission('Employees', 'add') !== 'None';
  const canUpdate = isAdmin() || getModulePermission('Employees', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Employees', 'delete') !== 'None';

  // Load employees with pagination
  const loadEmployees = useCallback(async (pageNum = page, searchTerm = debouncedSearch) => {
    try {
      setLoading(true);
      const response = await employeeService.getAllPaginated(pageNum, size, searchTerm);
      setEmployees(response.data.content || []);
      setTotalElements(response.data.totalElements || 0);
      setTotalPages(response.data.totalPages || 0);
      setSelectedIds([]);
    } catch (error) {
      console.error('Error loading employees:', error);
      alert('Unable to load employees. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, [page, size, debouncedSearch]);

  // Load all employees for export/import (only when needed)
  const loadAllEmployees = useCallback(async () => {
    try {
      const response = await employeeService.getAll();
      setAllEmployeesForExport(response.data || []);
      return response.data || [];
    } catch (error) {
      console.error('Error loading all employees:', error);
      return [];
    }
  }, []);

  // Load employees when page or search changes
  useEffect(() => {
    loadEmployees(page, debouncedSearch);
  }, [page, debouncedSearch, loadEmployees]);

  // Reset to page 0 when search changes
  useEffect(() => {
    if (search !== debouncedSearch) {
      setPage(0);
    }
  }, [debouncedSearch, search]);

  const handleSingleDelete = async (employee) => {
    const confirmed = window.confirm(`Are you sure you want to permanently delete ${employee.fullName}?`);
    if (!confirmed) return;
    try {
      await employeeService.delete(employee.id);
      // Reload current page, or go to previous page if current page becomes empty
      if (employees.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        await loadEmployees(page, debouncedSearch);
      }
    } catch (error) {
      alert('Failed to delete employee');
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const handleToggleAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map((employee) => employee.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      setBulkDeleteOpen(false);
      return;
    }

    try {
      setBusy(true);
      for (const id of selectedIds) {
        try {
          await employeeService.delete(id);
        } catch (error) {
        }
      }
      setBulkDeleteOpen(false);
      await loadEmployees(page, debouncedSearch);
    } finally {
      setBusy(false);
    }
  };

  // No need for client-side filtering - search is done on backend
  const filteredEmployees = employees;

  const handleExport = async () => {
    // Load all employees for export (not just current page)
    const allEmployees = allEmployeesForExport.length > 0 
      ? allEmployeesForExport 
      : await loadAllEmployees();
    
    if (!allEmployees.length) {
      alert('No employees to export.');
      return;
    }

    const header = [
      'Employee ID',
      'Employee Type',
      'Employee',
      'Email',
      'Role',
      'Mobile',
      'Designation',
      'Department',
      'Reporting to',
      'Joining Date',
      'Status',
    ];

    const rows = allEmployees.map((employee) => [
      employee.employeeId || '',
      employee.employmentType || '',
      employee.fullName || '',
      employee.email || '',
      employee.roleName || '',
      employee.mobile || '',
      employee.designationName || '',
      employee.department || '',
      employee.reportingManagerName || '',
      employee.joiningDate || '',
      employee.status || '',
    ]);

    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employees.csv');
    link.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text) => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length);
    if (!lines.length) return [];

    const [headerLine, ...rows] = lines;
    const headers = headerLine
      .split(',')
      .map((value) => value.replace(/^"|"$/g, '').trim().toLowerCase());

    return rows.map((line) => {
      const values = line.split(',').map((value) => value.replace(/^"|"$/g, '').trim());
      const record = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      return record;
    });
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    setImportError('');
    setImportSummary(null);

    try {
      const text = await file.text();
      const records = parseCsv(text);
      if (!records.length) {
        setImportError('CSV file is empty or invalid.');
        return;
      }

      // Load all employees for import matching (not just current page)
      const allEmployees = allEmployeesForExport.length > 0 
        ? allEmployeesForExport 
        : await loadAllEmployees();
      
      // Load all designations to map names to IDs
      let designationsMap = new Map();
      try {
        const designationsResponse = await designationService.getAll();
        designationsMap = new Map(
          (designationsResponse.data || []).map(des => [
            des.name.toLowerCase().trim(),
            des.id
          ])
        );
      } catch (error) {
        console.warn('Could not load designations:', error);
      }
      
      // Build quick lookup maps for existing employees
      const byEmail = new Map(
        allEmployees
          .filter((employee) => employee.email)
          .map((employee) => [employee.email.toLowerCase(), employee]),
      );
      const byEmployeeId = new Map(
        allEmployees
          .filter((employee) => employee.employeeId)
          .map((employee) => [employee.employeeId, employee]),
      );

      let created = 0;
      let updated = 0;
      let failed = 0;

      for (const record of records) {
        const email = record['email'] || record['employee email'] || record['mail'] || '';
        const employeeName = record['employee'] || record['name'] || '';
        const employeeId = record['employee id'] || record['employeeid'] || '';

        if (!email && !employeeId && !employeeName) {
          // nothing to work with
          failed += 1;
          // eslint-disable-next-line no-continue
          continue;
        }

        const nameParts = employeeName.split(' ').filter(Boolean);
        const firstName = nameParts[0] || employeeName || email || 'Employee';
        const lastName = nameParts.slice(1).join(' ') || '';

        const mobile = record['mobile'] || record['phone'] || '';
        const roleName = record['role'] || '';
        const designationName = record['designation'] || '';
        const department = record['department'] || '';
        const status = record['status'] || 'ACTIVE';

        // Map designation name to ID
        let designationId = null;
        if (designationName) {
          const designationKey = designationName.toLowerCase().trim();
          designationId = designationsMap.get(designationKey) || null;
          if (!designationId && designationName) {
            console.warn(`Designation "${designationName}" not found in system`);
          }
        }

        const existing =
          (email && byEmail.get(email.toLowerCase())) ||
          (employeeId && byEmployeeId.get(employeeId));

        const basePayload = {
          email: email || (existing ? existing.email : ''),
          firstName,
          lastName,
          employeeId: employeeId || '',
          mobile,
          department: department || (existing ? existing.department : ''),
          status,
          designationId: designationId || (existing ? existing.designationId : null),
        };

        try {
          if (existing) {
            await employeeService.update(existing.id, {
              ...existing,
              ...basePayload,
              roleId: existing.roleId || null,
              reportingManagerId: existing.reportingManagerId || null,
              password: undefined,
            });
            updated += 1;
          } else {
            await employeeService.create({
              ...basePayload,
              password: null, // null will trigger default password "password123" in backend
            });
            created += 1;
          }
        } catch (error) {
          failed += 1;
        }
      }

      // Reload current page after import
      await loadEmployees(page, debouncedSearch);
      // Also reload all employees cache for export
      await loadAllEmployees();
      setImportSummary({ created, updated, failed });
    } catch (error) {
      setImportError('Failed to import employees. Please check the CSV format.');
    }
  };

  const startImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleDownloadIdCards = async () => {
    if (!selectedIds.length) {
      alert('Please select at least one employee.');
      return;
    }
    try {
      setIdCardDownloading(true);
      if (selectedIds.length === 1) {
        const { data } = await idCardService.getPdfForEmployee(selectedIds[0]);
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'id-card.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const { data } = await idCardService.getBulkPdf(selectedIds);
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'id-cards.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to download ID cards. Please try again.');
    } finally {
      setIdCardDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-gray-600">
        Loading employees…
      </div>
    );
  }

  const allSelected = employees.length > 0 && selectedIds.length === employees.length;
  const showCheckboxes = canDelete || isAdmin();

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
              <div className="hidden">
                {/* Page title removed - shown in topbar */}
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, email, phone, or ID"
                  className="w-full sm:w-64 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[44px]"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(event) => handleImportFile(event.target.files?.[0])}
                />
                {isAdmin() && (
                  <>
                    <button
                      type="button"
                      onClick={startImport}
                      className="rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
                    >
                      Import CSV
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      className="rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 min-h-[44px]"
                    >
                      Export CSV
                    </button>
                  </>
                )}
                {isAdmin() && (
                  <button
                    type="button"
                    onClick={handleDownloadIdCards}
                    disabled={idCardDownloading || !selectedIds.length}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {idCardDownloading ? 'Preparing…' : 'Download ID Cards'}
                  </button>
                )}
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => navigate('/employees/new')}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
                  >
                    + Add Employee
                  </button>
                )}
              </div>
            </div>

            {importError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {importError}
              </div>
            )}
            {importSummary && (
              <div className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
                Imported employees — created: {importSummary.created}, updated: {importSummary.updated}, failed:{' '}
                {importSummary.failed}.
              </div>
            )}

            <section className="rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-3 text-sm text-gray-600">
                <div>
                  Showing <span className="font-semibold">{filteredEmployees.length}</span> of{' '}
                  <span className="font-semibold">{totalElements}</span> employees
                  {totalPages > 1 && (
                    <span className="ml-2 text-gray-500">
                      (Page {page + 1} of {totalPages})
                    </span>
                  )}
                </div>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setBulkDeleteOpen(true)}
                    disabled={!selectedIds.length}
                    className={`text-sm font-semibold ${selectedIds.length
                        ? 'text-red-600 hover:text-red-700'
                        : 'cursor-not-allowed text-gray-300'
                      }`}
                  >
                    Delete selected ({selectedIds.length})
                  </button>
                )}
              </div>

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle sm:px-0">
                  <div className="max-h-[calc(100vh-260px)] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-100 text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 sticky top-0 z-10">
                        <tr>
                          {showCheckboxes && (
                            <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleToggleAll}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </th>
                          )}
                          <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap min-w-[180px]">Name</th>
                          <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap min-w-[100px] hidden md:table-cell">Employee ID</th>
                          <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap min-w-[180px] hidden lg:table-cell">Email</th>
                          <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap min-w-[120px] hidden xl:table-cell">Mobile</th>
                          <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap min-w-[100px] hidden lg:table-cell">Role</th>
                          <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap min-w-[120px] hidden md:table-cell">Designation</th>
                          <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap min-w-[80px]">Status</th>
                          {(canUpdate || canDelete) && <th className="px-3 sm:px-4 py-3 text-left whitespace-nowrap min-w-[60px]">Action</th>}
                        </tr>
                      </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredEmployees.length === 0 && (
                        <tr>
                          <td
                            colSpan={
                              8 + // Base columns (Name, Employee ID, Email, Mobile, Role, Designation, Status)
                              (showCheckboxes ? 1 : 0) + // Checkbox column
                              ((canUpdate || canDelete) ? 1 : 0) // Action column
                            }
                            className="px-4 py-8 text-center text-sm text-gray-500"
                          >
                            No employees match your search.
                          </td>
                        </tr>
                      )}
                      {filteredEmployees.map((employee) => {
                        const selected = selectedIds.includes(employee.id);
                        return (
                          <tr
                            key={employee.id}
                            className={selected ? 'bg-blue-50/60' : 'hover:bg-gray-50'}
                          >
                            {showCheckboxes && (
                              <td className="px-2 py-3">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={() => handleToggleRow(employee.id)}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                            )}
                            <td
                              className="px-3 sm:px-4 py-3 cursor-pointer whitespace-nowrap"
                              onClick={() => navigate(`/employees/${employee.id}/view`)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar
                                  profilePictureUrl={employee.profilePictureUrl}
                                  fullName={employee.fullName}
                                  size="w-8 h-8"
                                  className="border border-gray-200 flex-shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                    {employee.fullName}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate md:hidden">
                                    {employee.designationName || employee.roleName || '—'}
                                  </div>
                                  {/* Show email and mobile on mobile view */}
                                  <div className="md:hidden mt-1 space-y-0.5">
                                    <div className="text-xs text-gray-500 truncate">{employee.email}</div>
                                    {employee.mobile && <div className="text-xs text-gray-500 truncate">{employee.mobile}</div>}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap hidden md:table-cell">{employee.employeeId || '—'}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap hidden lg:table-cell">
                              <span className="block truncate">{employee.email}</span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap hidden xl:table-cell">{employee.mobile || '—'}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap hidden lg:table-cell">{employee.roleName || '—'}</td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap hidden md:table-cell">
                              <span className="block truncate">{employee.designationName || employee.department || '—'}</span>
                            </td>
                            <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${employee.status === 'ACTIVE'
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                                  }`}
                              >
                                {employee.status}
                              </span>
                            </td>
                            {(canUpdate || canDelete) && (
                              <td className="relative px-2 sm:px-3 md:px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                <button
                                  type="button"
                                  ref={(el) => {
                                    if (el) menuRefs.current[employee.id] = el;
                                  }}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setOpenMenuId((current) => (current === employee.id ? null : employee.id));
                                  }}
                                  className="rounded px-2 py-1.5 hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors text-lg leading-none font-bold text-gray-600"
                                  aria-label="Actions menu"
                                >
                                  &#8942;
                                </button>
                                {openMenuId === employee.id && (
                                  <MenuDropdown
                                    onView={() => { setOpenMenuId(null); navigate(`/employees/${employee.id}/view`); }}
                                    onEdit={canUpdate ? () => { setOpenMenuId(null); navigate(`/employees/${employee.id}/edit`); } : null}
                                    onDelete={canDelete ? () => { setOpenMenuId(null); handleSingleDelete(employee); } : null}
                                    triggerRef={menuRefs.current[employee.id]}
                                  />
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage(0)}
                      disabled={page === 0 || loading}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 0 || loading}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="px-3 text-sm text-gray-700">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages - 1 || loading}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage(totalPages - 1)}
                      disabled={page >= totalPages - 1 || loading}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Last
                    </button>
                  </div>
                  <div className="text-sm text-gray-600">
                    Showing {page * size + 1} to {Math.min((page + 1) * size, totalElements)} of {totalElements}
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <Modal
        isOpen={bulkDeleteOpen}
        onClose={() => (busy ? null : setBulkDeleteOpen(false))}
        title="Delete selected employees"
        size="sm"
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to delete <span className="font-semibold">{selectedIds.length}</span>{' '}
          selected employee{selectedIds.length === 1 ? '' : 's'}? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => setBulkDeleteOpen(false)}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleBulkDelete}
            className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

// MenuDropdown component with smart positioning
// NEW — Simple Fixed Dropdown (Non-Scrollable like Example)
const MenuDropdown = ({ onView, onEdit, onDelete, triggerRef }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    if (triggerRef && menuRef.current) {
      const rect = triggerRef.getBoundingClientRect();
      const menu = menuRef.current;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = 128; // w-32 = 128px
      const menuHeight = menu.offsetHeight || 120; // approximate height

      menu.style.position = "fixed";
      menu.style.zIndex = "9999";

      // Calculate horizontal position - ensure menu doesn't go off screen
      let left = rect.left;
      if (left + menuWidth > viewportWidth) {
        // If menu would overflow right, align to right edge of trigger
        left = rect.right - menuWidth;
      }
      // Ensure menu doesn't go off left edge
      if (left < 0) {
        left = 8; // 8px padding from left edge
      }

      // Calculate vertical position - ensure menu doesn't go off screen
      let top = rect.bottom + 6;
      if (top + menuHeight > viewportHeight) {
        // If menu would overflow bottom, show above trigger instead
        top = rect.top - menuHeight - 6;
      }
      // Ensure menu doesn't go off top edge
      if (top < 0) {
        top = 8; // 8px padding from top edge
      }

      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
    }
  }, [triggerRef]);

  return (
    <div
      ref={menuRef}
      className="w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] fixed"
      onClick={(e) => e.stopPropagation()}
      style={{ minWidth: '120px' }}
    >
      <button 
        className="block w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors first:rounded-t-lg" 
        onClick={onView}
      >
        View
      </button>
      {onEdit && (
        <button 
          className="block w-full px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors" 
          onClick={onEdit}
        >
          Edit
        </button>
      )}
      {onDelete && (
        <button
          className="block w-full px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition-colors last:rounded-b-lg"
          onClick={onDelete}
        >
          Delete
        </button>
      )}
    </div>
  );
};


export default EmployeesList;

