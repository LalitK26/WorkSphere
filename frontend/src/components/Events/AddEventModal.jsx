import React, { useState, useEffect } from 'react';
import eventsApi from '../../api/eventsApi';
import { departmentService } from '../../api/departmentService';
import { employeeService } from '../../api/employeeService';
import Modal from '../UI/Modal';

const AddEventModal = ({ event, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        eventName: '',
        where: '',
        description: '',
        startsOnDate: '',
        startsOnTime: '',
        endsOnDate: '',
        endsOnTime: '',
        status: 'PENDING',
        eventLink: '',
        departmentIds: [],
        employeeIds: [],
    });

    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showDeptDropdown, setShowDeptDropdown] = useState(false);
    const [showEmpDropdown, setShowEmpDropdown] = useState(false);
    const [deptSearch, setDeptSearch] = useState('');
    const [empSearch, setEmpSearch] = useState('');

    useEffect(() => {
        fetchDepartments();
        fetchEmployees();

        if (event) {
            setFormData({
                eventName: event.eventName || '',
                where: event.where || '',
                description: event.description || '',
                startsOnDate: event.startsOnDate || '',
                startsOnTime: event.startsOnTime || '',
                endsOnDate: event.endsOnDate || '',
                endsOnTime: event.endsOnTime || '',
                status: event.status || 'PENDING',
                eventLink: event.eventLink || '',
                departmentIds: event.departments?.map(d => d.id) || [],
                employeeIds: event.employees?.map(e => e.id) || [],
            });
        }
    }, [event]);

    const fetchDepartments = async () => {
        try {
            const response = await departmentService.getAll();
            setDepartments(response.data || []);
        } catch (error) {
        }
    };

    const fetchEmployees = async () => {
        try {
            const response = await employeeService.getAll();
            setEmployees(response.data || []);
        } catch (error) {
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const toggleDepartment = (deptId) => {
        setFormData(prev => ({
            ...prev,
            departmentIds: prev.departmentIds.includes(deptId)
                ? prev.departmentIds.filter(id => id !== deptId)
                : [...prev.departmentIds, deptId]
        }));
    };

    const toggleEmployee = (empId) => {
        setFormData(prev => ({
            ...prev,
            employeeIds: prev.employeeIds.includes(empId)
                ? prev.employeeIds.filter(id => id !== empId)
                : [...prev.employeeIds, empId]
        }));
    };

    const selectAllDepartments = () => {
        const filtered = getFilteredDepartments();
        setFormData(prev => ({
            ...prev,
            departmentIds: [...new Set([...prev.departmentIds, ...filtered.map(d => d.id)])]
        }));
    };

    const deselectAllDepartments = () => {
        setFormData(prev => ({ ...prev, departmentIds: [] }));
    };

    const selectAllEmployees = () => {
        const filtered = getFilteredEmployees();
        setFormData(prev => ({
            ...prev,
            employeeIds: [...new Set([...prev.employeeIds, ...filtered.map(e => e.id)])]
        }));
    };

    const deselectAllEmployees = () => {
        setFormData(prev => ({ ...prev, employeeIds: [] }));
    };

    const getFilteredDepartments = () => {
        return departments.filter(dept =>
            dept.name.toLowerCase().includes(deptSearch.toLowerCase())
        );
    };

    const getFilteredEmployees = () => {
        return employees.filter(emp =>
            `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(empSearch.toLowerCase()) ||
            emp.email.toLowerCase().includes(empSearch.toLowerCase())
        );
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.eventName.trim()) {
            newErrors.eventName = 'Event name is required';
        }
        if (!formData.where.trim()) {
            newErrors.where = 'Location is required';
        }
        if (!formData.startsOnDate) {
            newErrors.startsOnDate = 'Start date is required';
        }
        if (!formData.startsOnTime) {
            newErrors.startsOnTime = 'Start time is required';
        }
        if (!formData.endsOnDate) {
            newErrors.endsOnDate = 'End date is required';
        }
        if (!formData.endsOnTime) {
            newErrors.endsOnTime = 'End time is required';
        }

        // Validate end date/time is after start date/time
        if (formData.startsOnDate && formData.startsOnTime && formData.endsOnDate && formData.endsOnTime) {
            const startDateTime = new Date(`${formData.startsOnDate}T${formData.startsOnTime}`);
            const endDateTime = new Date(`${formData.endsOnDate}T${formData.endsOnTime}`);
            if (endDateTime <= startDateTime) {
                newErrors.endsOnDate = 'End date/time must be after start date/time';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        try {
            setLoading(true);
            if (event?.id) {
                await eventsApi.updateEvent(event.id, formData);
            } else {
                await eventsApi.createEvent(formData);
            }
            onSave();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={event ? 'Edit Event' : 'Add Event'} size="xl" variant="panel">
            <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Event Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="eventName"
                            value={formData.eventName}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Enter event name"
                        />
                        {errors.eventName && <p className="text-red-500 text-xs mt-1">{errors.eventName}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Where <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="where"
                            value={formData.where}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="Enter location"
                        />
                        {errors.where && <p className="text-red-500 text-xs mt-1">{errors.where}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Enter description"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Starts On Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="startsOnDate"
                            value={formData.startsOnDate}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        {errors.startsOnDate && <p className="text-red-500 text-xs mt-1">{errors.startsOnDate}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Starts On Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="time"
                            name="startsOnTime"
                            value={formData.startsOnTime}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        {errors.startsOnTime && <p className="text-red-500 text-xs mt-1">{errors.startsOnTime}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ends On Date <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="endsOnDate"
                            value={formData.endsOnDate}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        {errors.endsOnDate && <p className="text-red-500 text-xs mt-1">{errors.endsOnDate}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ends On Time <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="time"
                            name="endsOnTime"
                            value={formData.endsOnTime}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                        {errors.endsOnTime && <p className="text-red-500 text-xs mt-1">{errors.endsOnTime}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Department Multi-Select */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Department
                        </label>
                        <div
                            onClick={() => setShowDeptDropdown(!showDeptDropdown)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 cursor-pointer flex justify-between items-center bg-white"
                        >
                            <span className="text-sm">
                                {formData.departmentIds.length > 0
                                    ? `${formData.departmentIds.length} selected`
                                    : 'Nothing selected'}
                            </span>
                            <span className="text-gray-500">▼</span>
                        </div>
                        {showDeptDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="p-2 border-b border-gray-200">
                                    <input
                                        type="text"
                                        value={deptSearch}
                                        onChange={(e) => setDeptSearch(e.target.value)}
                                        placeholder="Search departments..."
                                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="p-2 border-b border-gray-200 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); selectAllDepartments(); }}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); deselectAllDepartments(); }}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                                {getFilteredDepartments().map(dept => (
                                    <div
                                        key={dept.id}
                                        onClick={(e) => { e.stopPropagation(); toggleDepartment(dept.id); }}
                                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.departmentIds.includes(dept.id)}
                                            onChange={() => { }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-800">{dept.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Employee Multi-Select */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Employee
                        </label>
                        <div
                            onClick={() => setShowEmpDropdown(!showEmpDropdown)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 cursor-pointer flex justify-between items-center bg-white"
                        >
                            <span className="text-sm">
                                {formData.employeeIds.length > 0
                                    ? `${formData.employeeIds.length} selected`
                                    : 'Nothing selected'}
                            </span>
                            <span className="text-gray-500">▼</span>
                        </div>
                        {showEmpDropdown && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <div className="p-2 border-b border-gray-200">
                                    <input
                                        type="text"
                                        value={empSearch}
                                        onChange={(e) => setEmpSearch(e.target.value)}
                                        placeholder="Search employees..."
                                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                                <div className="p-2 border-b border-gray-200 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); selectAllEmployees(); }}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); deselectAllEmployees(); }}
                                        className="text-xs text-blue-600 hover:text-blue-700"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                                {getFilteredEmployees().map(emp => (
                                    <div
                                        key={emp.id}
                                        onClick={(e) => { e.stopPropagation(); toggleEmployee(emp.id); }}
                                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center gap-2"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={formData.employeeIds.includes(emp.id)}
                                            onChange={() => { }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-800">{emp.firstName} {emp.lastName}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status
                        </label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                            <option value="PENDING">Pending</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Event Link
                        </label>
                        <input
                            type="url"
                            name="eventLink"
                            value={formData.eventLink}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                            placeholder="e.g. https://www.example.com"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
                    >
                        {loading ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddEventModal;
