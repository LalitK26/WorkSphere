import React, { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { holidayService } from '../../api/holidayService';
import { designationService } from '../../api/designationService';
import { departmentService } from '../../api/departmentService';
import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/Layout/Sidebar';
import Topbar from '../../components/Layout/Topbar';
import Modal from '../../components/UI/Modal';
import SearchableMultiSelect from '../../components/UI/SearchableMultiSelect';
import '../Calendar/calendar.css';

const Holidays = () => {
  const { isAdmin, getModulePermission } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [filteredHolidays, setFilteredHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const calendarRef = useRef(null);

  // Get permissions for Holidays module
  const canAdd = isAdmin() || getModulePermission('Holidays', 'add') !== 'None';
  const canUpdate = isAdmin() || getModulePermission('Holidays', 'update') !== 'None';
  const canDelete = isAdmin() || getModulePermission('Holidays', 'delete') !== 'None';

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    occasion: '',
    isCommon: false,
    departments: [],
    designations: [],
    employmentTypes: [],
  });

  // Options for dropdowns
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const employmentTypeOptions = ['Full-time', 'Part-time', 'Internship', 'Contract'];

  useEffect(() => {
    fetchHolidays();
    loadOptions();
  }, []);

  useEffect(() => {
    applySearchFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, holidays]);

  const loadOptions = async () => {
    try {
      // Load all departments from department service
      const { data: departmentsData } = await departmentService.getAll();
      setDepartments(departmentsData);

      // Load designations
      const { data: designationsData } = await designationService.getAll();
      setDesignations(designationsData);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const { data } = await holidayService.getAll();
      setHolidays(data);
      setFilteredHolidays(data);
    } catch (error) {
      alert('Error loading holidays');
    } finally {
      setLoading(false);
    }
  };

  const applySearchFilter = () => {
    if (!searchTerm.trim()) {
      setFilteredHolidays(holidays);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = holidays.filter(holiday =>
      holiday.occasion.toLowerCase().includes(searchLower)
    );
    setFilteredHolidays(filtered);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    applySearchFilter();
  };

  const handleDateChange = (arg) => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      const start = calendarApi.view.activeStart;
      const end = calendarApi.view.activeEnd;
      fetchHolidaysForRange(start, end);
    }
  };

  const fetchHolidaysForRange = async (start, end) => {
    try {
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];
      const { data } = await holidayService.getAll({ startDate, endDate });
      setHolidays(data);
      // Apply search filter after setting holidays
      if (!searchTerm.trim()) {
        setFilteredHolidays(data);
      } else {
        const searchLower = searchTerm.toLowerCase();
        const filtered = data.filter(holiday =>
          holiday.occasion.toLowerCase().includes(searchLower)
        );
        setFilteredHolidays(filtered);
      }
    } catch (error) {
    }
  };

  const openAddModal = () => {
    setFormData({
      date: '',
      occasion: '',
      isCommon: false,
      departments: [],
      designations: [],
      employmentTypes: [],
    });
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setFormData({
      date: '',
      occasion: '',
      isCommon: false,
      departments: [],
      designations: [],
      employmentTypes: [],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        date: formData.date,
        occasion: formData.occasion.trim(),
        isCommon: formData.isCommon,
        departments: formData.departments,
        designations: formData.designations.map(Number),
        employmentTypes: formData.employmentTypes,
      };

      await holidayService.create(payload);
      closeAddModal();
      await fetchHolidays();

      // Refresh calendar view
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.refetchEvents();
      }
    } catch (error) {
      alert(error?.response?.data?.message || 'Error creating holiday');
    }
  };

  const calendarEvents = filteredHolidays.map(holiday => ({
    id: holiday.id.toString(),
    title: holiday.occasion,
    start: holiday.date,
    allDay: true,
    backgroundColor: holiday.isCommon ? '#10b981' : '#3b82f6',
    borderColor: holiday.isCommon ? '#10b981' : '#3b82f6',
    extendedProps: {
      holiday: holiday
    }
  }));

  const handleEventClick = (clickInfo) => {
    // Only allow admins to edit/delete holidays
    if (isAdmin() && clickInfo.event.extendedProps.holiday) {
      const holiday = clickInfo.event.extendedProps.holiday;
      setEditingHoliday(holiday);
      setFormData({
        date: holiday.date,
        occasion: holiday.occasion,
        isCommon: holiday.isCommon || false,
        departments: holiday.departments || [],
        designations: holiday.designations || [],
        employmentTypes: holiday.employmentTypes || [],
      });
      setIsEditModalOpen(true);
    }
  };

  const openEditModal = (holiday) => {
    setEditingHoliday(holiday);
    setFormData({
      date: holiday.date,
      occasion: holiday.occasion,
      isCommon: holiday.isCommon || false,
      departments: holiday.departments || [],
      designations: holiday.designations || [],
      employmentTypes: holiday.employmentTypes || [],
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingHoliday(null);
    setFormData({
      date: '',
      occasion: '',
      isCommon: false,
      departments: [],
      designations: [],
      employmentTypes: [],
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingHoliday) return;
    
    try {
      const payload = {
        date: formData.date,
        occasion: formData.occasion.trim(),
        isCommon: formData.isCommon,
        departments: formData.departments,
        designations: formData.designations.map(Number),
        employmentTypes: formData.employmentTypes,
      };

      await holidayService.update(editingHoliday.id, payload);
      closeEditModal();
      await fetchHolidays();

      // Refresh calendar view
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.refetchEvents();
      }
    } catch (error) {
      alert(error?.response?.data?.message || 'Error updating holiday');
    }
  };

  const handleDelete = async () => {
    if (!editingHoliday) return;
    
    if (!window.confirm(`Are you sure you want to delete the holiday "${editingHoliday.occasion}"?`)) {
      return;
    }

    try {
      await holidayService.delete(editingHoliday.id);
      closeEditModal();
      await fetchHolidays();

      // Refresh calendar view
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.refetchEvents();
      }
    } catch (error) {
      alert(error?.response?.data?.message || 'Error deleting holiday');
    }
  };

  const handleDepartmentChange = (selectedDepartmentIds) => {
    // Map department IDs to department names
    const selectedDepartmentNames = departments
      .filter(dept => selectedDepartmentIds.includes(dept.id))
      .map(dept => dept.name);
    setFormData(prev => ({
      ...prev,
      departments: selectedDepartmentNames,
    }));
  };

  const handleDesignationChange = (selectedDesignationIds) => {
    setFormData(prev => ({
      ...prev,
      designations: selectedDesignationIds,
    }));
  };

  const handleEmploymentTypeToggle = (type) => {
    setFormData(prev => ({
      ...prev,
      employmentTypes: prev.employmentTypes.includes(type)
        ? prev.employmentTypes.filter(t => t !== type)
        : [...prev.employmentTypes, type],
    }));
  };

  // Get selected department IDs from department names
  const getSelectedDepartmentIds = () => {
    return departments
      .filter(dept => formData.departments.includes(dept.name))
      .map(dept => dept.id);
  };

  const selectAllEmploymentTypes = () => {
    setFormData(prev => ({
      ...prev,
      employmentTypes: employmentTypeOptions,
    }));
  };

  const deselectAllEmploymentTypes = () => {
    setFormData(prev => ({
      ...prev,
      employmentTypes: [],
    }));
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col space-y-3 md:flex-row md:items-center md:space-y-0 md:justify-between">
              <div className="hidden">
                {/* Page title removed - shown in topbar */}
              </div>
              <div className="flex items-center gap-3">
                {/* Search Bar - Top Right */}
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder="Search holidays..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64 bg-white border border-gray-300 rounded-full px-4 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-gray-400 shadow-sm"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-blue-600 transition-colors rounded"
                    title="Search"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </form>
                {canAdd && (
                  <button
                    onClick={openAddModal}
                    className="inline-flex items-center px-5 py-2.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    + Add Holiday
                  </button>
                )}
              </div>
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4">
              {loading ? (
                <div className="text-center py-8 text-gray-600">Loading holidays...</div>
              ) : (
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
                  }}
                  events={calendarEvents}
                  nowIndicator={true}
                  editable={false}
                  selectable={false}
                  height="auto"
                  contentHeight="auto"
                  aspectRatio={1.8}
                  views={{
                    dayGridMonth: { buttonText: 'Month' },
                    timeGridWeek: { buttonText: 'Week' },
                    timeGridDay: { buttonText: 'Day' },
                    listWeek: { buttonText: 'List' }
                  }}
                  datesSet={handleDateChange}
                  ref={calendarRef}
                  eventClick={isAdmin() ? handleEventClick : undefined}
                  eventContent={(eventInfo) => (
                    <div className={`fc-event-title ${isAdmin() ? 'cursor-pointer' : ''}`} title={isAdmin() ? 'Click to edit' : ''}>
                      {eventInfo.event.title}
                    </div>
                  )}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Holiday Modal */}
      {canAdd && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={closeAddModal}
          title="Add Holiday"
          size="lg"
          variant="panel"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Occasion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occasion *
                </label>
                <input
                  type="text"
                  required
                  value={formData.occasion}
                  onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                  placeholder="Occasion"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Is Common */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isCommon"
                checked={formData.isCommon}
                onChange={(e) => setFormData({ ...formData, isCommon: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isCommon" className="text-sm font-medium text-gray-700">
                Mark as common holiday (applies to everyone)
              </label>
            </div>

            {!formData.isCommon && (
              <>
                {/* Departments */}
                <div>
                  <SearchableMultiSelect
                    label="Department"
                    placeholder="Select departments"
                    options={departments}
                    selected={getSelectedDepartmentIds()}
                    onChange={handleDepartmentChange}
                    getOptionLabel={(dept) => dept.name}
                    getOptionValue={(dept) => dept.id}
                  />
                </div>

                {/* Designations */}
                <div>
                  <SearchableMultiSelect
                    label="Designation"
                    placeholder="Select designations"
                    options={designations}
                    selected={formData.designations}
                    onChange={handleDesignationChange}
                    getOptionLabel={(desig) => desig.name}
                    getOptionValue={(desig) => desig.id}
                  />
                </div>

                {/* Employment Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={selectAllEmploymentTypes}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllEmploymentTypes}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Deselect All
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-white border border-gray-300 rounded p-2 space-y-1">
                    {employmentTypeOptions.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.employmentTypes.includes(type)}
                          onChange={() => handleEmploymentTypeToggle(type)}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                ✓ Save
              </button>
              <button
                type="button"
                onClick={closeAddModal}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Holiday Modal */}
      {isAdmin() && isEditModalOpen && editingHoliday && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          title="Edit Holiday"
          size="lg"
          variant="panel"
        >
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Occasion */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Occasion *
                </label>
                <input
                  type="text"
                  required
                  value={formData.occasion}
                  onChange={(e) => setFormData({ ...formData, occasion: e.target.value })}
                  placeholder="Occasion"
                  className="w-full bg-white border border-gray-300 rounded px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Is Common */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editIsCommon"
                checked={formData.isCommon}
                onChange={(e) => setFormData({ ...formData, isCommon: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="editIsCommon" className="text-sm font-medium text-gray-700">
                Mark as common holiday (applies to everyone)
              </label>
            </div>

            {!formData.isCommon && (
              <>
                {/* Departments */}
                <div>
                  <SearchableMultiSelect
                    label="Department"
                    placeholder="Select departments"
                    options={departments}
                    selected={getSelectedDepartmentIds()}
                    onChange={handleDepartmentChange}
                    getOptionLabel={(dept) => dept.name}
                    getOptionValue={(dept) => dept.id}
                  />
                </div>

                {/* Designations */}
                <div>
                  <SearchableMultiSelect
                    label="Designation"
                    placeholder="Select designations"
                    options={designations}
                    selected={formData.designations}
                    onChange={handleDesignationChange}
                    getOptionLabel={(desig) => desig.name}
                    getOptionValue={(desig) => desig.id}
                  />
                </div>

                {/* Employment Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={selectAllEmploymentTypes}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAllEmploymentTypes}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 border border-gray-300"
                    >
                      Deselect All
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-white border border-gray-300 rounded p-2 space-y-1">
                    {employmentTypeOptions.map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.employmentTypes.includes(type)}
                          onChange={() => handleEmploymentTypeToggle(type)}
                          className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Form Actions */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                ✓ Update
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={closeEditModal}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Holidays;

