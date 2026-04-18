import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { leaveService, leaveTypeService } from '../../api/leaveService';
import { employeeService } from '../../api/employeeService';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import AddNewLeaveType from '../../components/Leaves/AddNewLeaveType';

const NewLeave = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const isAdminUser = isAdmin();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [allLeaveTypes, setAllLeaveTypes] = useState([]);
  const [isAddLeaveTypeOpen, setIsAddLeaveTypeOpen] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const employeeDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    userId: isAdminUser ? null : user?.userId,
    leaveTypeId: null,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    durationType: 'FULL_DAY',
    status: 'PENDING',
    reason: '',
    fileUrl: '',
  });

  useEffect(() => {
    loadData();
  }, [isAdminUser]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
        setIsEmployeeDropdownOpen(false);
        setEmployeeSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAdminUser) {
      setFormData((prev) => ({ ...prev, userId: user?.userId || null }));
    }
  }, [isAdminUser, user?.userId]);

  const loadData = async () => {
    try {
      setFeedback(null);
      if (isAdminUser) {
        const [employeesRes, leaveTypesRes] = await Promise.all([
          employeeService.getAll(),
          leaveTypeService.getAll(),
        ]);
        setEmployees(employeesRes.data);
        const allTypes = leaveTypesRes.data || [];
        setAllLeaveTypes(allTypes);
        setLeaveTypes(allTypes);
      } else {
        const leaveTypesRes = await leaveTypeService.getApplicable();
        const applicable = leaveTypesRes.data || [];
        setLeaveTypes(applicable);
        setAllLeaveTypes(applicable);
      }
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to load leave data',
      });
    }
  };

  const fetchApplicableLeaveTypes = useCallback(
    async (
      targetUserId,
      { preselectId, strictMatch, allowWithoutUser, fallbackToAll } = {}
    ) => {
      if (!targetUserId && !allowWithoutUser) {
        setLeaveTypes([]);
        setFormData((prev) => ({ ...prev, leaveTypeId: null }));
        return;
      }
      try {
        const response = await leaveTypeService.getApplicable(targetUserId || undefined);
        const applicable = response.data || [];
        let optionsToShow = applicable;
        let infoMessage = null;
        let infoType = 'info';

        if (!applicable.length) {
          if (fallbackToAll && allLeaveTypes.length) {
            optionsToShow = allLeaveTypes;
            infoMessage =
              'No leave types match the selection. Showing all leave types so you can override manually.';
            infoType = 'warning';
          } else if (!allowWithoutUser) {
            optionsToShow = [];
            infoMessage = 'No leave types satisfy the applicability rules for this employee.';
            infoType = 'error';
          }
        }

        setLeaveTypes(optionsToShow);

        if (infoMessage) {
          setFeedback({ type: infoType, text: infoMessage });
        } else if (!allowWithoutUser) {
          setFeedback(null);
        }

        const desiredId = preselectId;
        if (desiredId && optionsToShow.some((lt) => lt.id === desiredId)) {
          setFormData((prev) => ({ ...prev, leaveTypeId: desiredId }));
        } else if (strictMatch) {
          setFormData((prev) => ({ ...prev, leaveTypeId: null }));
        }
      } catch (error) {
        setLeaveTypes(fallbackToAll ? allLeaveTypes : []);
        setFormData((prev) => ({ ...prev, leaveTypeId: null }));
        setFeedback({
          type: 'error',
          text: error?.response?.data?.message || 'Unable to load applicable leave types',
        });
      }
    },
    [allLeaveTypes]
  );

  useEffect(() => {
    if (isAdminUser && formData.userId) {
      fetchApplicableLeaveTypes(formData.userId, {
        strictMatch: true,
        fallbackToAll: true,
      });
    }
  }, [isAdminUser, formData.userId, fetchApplicableLeaveTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setFeedback(null);
      await leaveService.create(formData);
      navigate('/leaves');
    } catch (error) {
      setFeedback({
        type: 'error',
        text: error?.response?.data?.message || 'Unable to create leave',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTypeAdded = (newLeaveType) => {
    if (isAdminUser) {
      setAllLeaveTypes((prev) => {
        const updated = [...prev, newLeaveType];
        if (!formData.userId) {
          setLeaveTypes(updated);
        }
        return updated;
      });
      if (formData.userId) {
        fetchApplicableLeaveTypes(formData.userId, {
          preselectId: newLeaveType.id,
          strictMatch: true,
          fallbackToAll: true,
        });
      }
    } else {
      setAllLeaveTypes((prev) => [...prev, newLeaveType]);
      fetchApplicableLeaveTypes(user?.userId, {
        preselectId: newLeaveType.id,
        allowWithoutUser: true,
      });
    }
    setIsAddLeaveTypeOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Assign Leave</h2>
                <button
                  type="button"
                  onClick={() => navigate('/leaves')}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                {feedback?.text && (
                  <div
                    className={`rounded border px-3 py-2 text-sm ${
                      feedback.type === 'error'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : feedback.type === 'warning'
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                          : 'bg-green-50 border-green-200 text-green-700'
                    }`}
                  >
                    {feedback.text}
                  </div>
                )}
                {/* Choose Member */}
                {isAdminUser ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Choose Member <span className="text-red-500">*</span>
                    </label>
                    <div className="relative" ref={employeeDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-left bg-white flex items-center justify-between"
                      >
                        <span className={formData.userId ? 'text-gray-900' : 'text-gray-500'}>
                          {formData.userId 
                            ? employees.find(emp => emp.id === formData.userId)?.fullName || '--'
                            : '--'
                          }
                        </span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isEmployeeDropdownOpen && (
                        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg max-h-60 overflow-hidden">
                          <div className="p-2 border-b border-gray-200">
                            <input
                              type="text"
                              value={employeeSearchTerm}
                              onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                              placeholder="Search employees..."
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {employees
                              .filter(emp => 
                                emp.fullName.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                              )
                              .length === 0 ? (
                              <div className="px-3 py-2 text-sm text-gray-500">No employees found</div>
                            ) : (
                              employees
                                .filter(emp => 
                                  emp.fullName.toLowerCase().includes(employeeSearchTerm.toLowerCase())
                                )
                                .map((emp) => {
                                  const isSelected = formData.userId === emp.id;
                                  return (
                                    <button
                                      key={emp.id}
                                      type="button"
                                      onClick={() => {
                                        setFormData((prev) => ({
                                          ...prev,
                                          userId: emp.id,
                                          leaveTypeId: null,
                                        }));
                                        setIsEmployeeDropdownOpen(false);
                                        setEmployeeSearchTerm('');
                                      }}
                                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                                        isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                      }`}
                                    >
                                      {emp.fullName}
                                    </button>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Choose Member <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={user?.fullName || ''}
                      disabled
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-500 bg-gray-100"
                    />
                  </div>
                )}

                {/* Leave Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      required
                      value={formData.leaveTypeId || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          leaveTypeId: e.target.value ? Number(e.target.value) : null,
                        }))
                      }
                      className="flex-1 border border-gray-300 rounded px-3 py-2 text-gray-900"
                    >
                      <option value="">--</option>
                      {leaveTypes.map(lt => (
                        <option key={lt.id} value={lt.id}>{lt.name}</option>
                      ))}
                    </select>
                    {isAdminUser && (
                      <button
                        type="button"
                        onClick={() => setIsAddLeaveTypeOpen(true)}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>

                {/* Status */}
                {isAdminUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                )}

                {/* Select Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Duration</label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="FULL_DAY"
                        checked={formData.durationType === 'FULL_DAY'}
                        onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                        className="mr-2"
                      />
                      Full Day
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="MULTIPLE"
                        checked={formData.durationType === 'MULTIPLE'}
                        onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                        className="mr-2"
                      />
                      Multiple
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="FIRST_HALF"
                        checked={formData.durationType === 'FIRST_HALF'}
                        onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                        className="mr-2"
                      />
                      First Half
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="SECOND_HALF"
                        checked={formData.durationType === 'SECOND_HALF'}
                        onChange={(e) => setFormData({ ...formData, durationType: e.target.value })}
                        className="mr-2"
                      />
                      Second Half
                    </label>
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  {formData.durationType === 'MULTIPLE' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                        <input
                          type="date"
                          required
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          required
                          value={formData.endDate}
                          onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                          className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                        />
                      </div>
                    </div>
                  ) : (
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => {
                        setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value });
                      }}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                    />
                  )}
                </div>

                {/* Reason for absence */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for absence <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="e.g. Feeling not well"
                    rows={4}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  />
                </div>

                {/* Add File */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Add File <span className="text-gray-400">?</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded p-8 text-center">
                    <input
                      type="file"
                      onChange={(e) => {
                        // Handle file upload - you might want to upload to a server first
                        const file = e.target.files[0];
                        if (file) {
                          // For now, just store the file name
                          setFormData({ ...formData, fileUrl: file.name });
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer text-gray-600">
                      Choose a file
                    </label>
                    {formData.fileUrl && (
                      <p className="mt-2 text-sm text-gray-500">{formData.fileUrl}</p>
                    )}
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    ✓ Save
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/leaves')}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* Add New Leave Type Modal */}
      {isAdminUser && (
        <AddNewLeaveType
          isOpen={isAddLeaveTypeOpen}
          onClose={() => setIsAddLeaveTypeOpen(false)}
          onSave={handleLeaveTypeAdded}
        />
      )}
    </div>
  );
};

export default NewLeave;

